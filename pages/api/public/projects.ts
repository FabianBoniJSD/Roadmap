import type { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';
import { getInstanceConfigBySlug } from '@/utils/instanceConfig';
import { resolveSharePointSiteUrl } from '@/utils/sharepointEnv';
import type { Project } from '@/types';

const RATE_LIMIT = 500; // requests per window
const WINDOW_MS = 60_000;
const rateBuckets = new Map<string, { count: number; reset: number }>();

const disableCache = (res: NextApiResponse) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
};

const getAllowedApiKeys = (): Set<string> => {
  const raw = process.env.PUBLIC_PROJECTS_API_KEYS || '';
  const keys = raw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  return new Set(keys);
};

const extractApiKey = (req: NextApiRequest): string | null => {
  const headerKey = req.headers['x-api-key'];
  if (typeof headerKey === 'string' && headerKey.trim()) return headerKey.trim();
  const queryKey = req.query.apiKey;
  if (typeof queryKey === 'string' && queryKey.trim()) return queryKey.trim();
  if (Array.isArray(queryKey) && queryKey[0]?.trim()) return queryKey[0].trim();
  return null;
};

const isRateLimited = (key: string): boolean => {
  const now = Date.now();
  const bucket = rateBuckets.get(key) || { count: 0, reset: now + WINDOW_MS };
  if (now > bucket.reset) {
    bucket.count = 0;
    bucket.reset = now + WINDOW_MS;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  return bucket.count > RATE_LIMIT;
};

const normalizeCategory = (value: unknown): string => {
  if (value == null) return '';
  const text = String(value).trim();
  if (/^\d+\.0$/.test(text)) return String(parseInt(text, 10));
  return text;
};

const toLower = (v: string | undefined) => (v ? v.toLowerCase() : '');

const isTruthyFlag = (value: unknown): boolean => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return (
      normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'all'
    );
  }
  if (Array.isArray(value)) return value.some((entry) => isTruthyFlag(entry));
  return false;
};

const filterProjects = (list: Project[], query: NextApiRequest['query']): Project[] => {
  const categoryFilter = normalizeCategory(query.category || '').toLowerCase();
  const statusFilterRaw =
    typeof query.status === 'string'
      ? query.status
      : Array.isArray(query.status)
        ? query.status.join(',')
        : '';
  const statusFilters = statusFilterRaw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const q = typeof query.q === 'string' ? query.q.trim().toLowerCase() : '';

  return list.filter((p) => {
    if (categoryFilter) {
      const cat = normalizeCategory(p.category).toLowerCase();
      if (cat !== categoryFilter) return false;
    }
    if (statusFilters.length) {
      const status = toLower(p.status);
      if (!statusFilters.includes(status)) return false;
    }
    if (q) {
      const haystack = [p.title, p.description, p.bisher, p.zukunft, p.geplante_umsetzung]
        .filter(Boolean)
        .map((s) => s!.toLowerCase())
        .join(' \n ');
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  disableCache(res);

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const allowedKeys = getAllowedApiKeys();
  if (!allowedKeys.size) {
    return res.status(500).json({ error: 'API keys not configured' });
  }

  const apiKey = extractApiKey(req);
  if (!apiKey || !allowedKeys.has(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  if (isRateLimited(apiKey)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Rate limit exceeded (500/min)' });
  }

  const instanceParam = req.query.instance || req.query.roadmapInstance;
  const slug = Array.isArray(instanceParam) ? instanceParam[0] : instanceParam;
  const instanceSlug = typeof slug === 'string' && slug.trim() ? slug.trim().toLowerCase() : null;

  try {
    const instance = instanceSlug
      ? await getInstanceConfigBySlug(instanceSlug)
      : await getInstanceConfigBySlug(
          (process.env.DEFAULT_ROADMAP_INSTANCE || 'default').toLowerCase()
        );

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const projects = await clientDataService.withInstance(instance.slug, () =>
      clientDataService.getAllProjects()
    );

    const normalized = Array.isArray(projects)
      ? projects.map((p) => ({ ...p, category: normalizeCategory(p.category) }))
      : [];

    const skipFilters = isTruthyFlag(req.query.all);
    const filtered = skipFilters ? normalized : filterProjects(normalized, req.query);
    res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT));
    res.setHeader('X-RateLimit-Remaining', 'n/a');
    res.setHeader('X-RateLimit-Window', `${WINDOW_MS / 1000}s`);

    return res.status(200).json({
      projects: filtered,
      count: filtered.length,
      instance: instance.slug,
      sharePointSiteUrl: resolveSharePointSiteUrl(instance),
    });
  } catch (error) {
    console.error('[api/public/projects] failed', error);
    return res.status(500).json({ error: 'Failed to fetch projects' });
  }
}
