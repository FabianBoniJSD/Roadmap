import type { NextApiRequest, NextApiResponse } from 'next';
import { resolveSharePointSiteUrl } from '@/utils/sharepointEnv';
import { getSharePointAuthHeaders } from '@/utils/spAuth';

// Whitelisted lists for safety
const ALLOWED_LISTS = new Set([
  'RoadmapProjects',
  'RoadmapCategories',
  'RoadmapSettings',
  'RoadmapFieldTypes',
  'RoadmapFields',
  'RoadmapTeamMembers',
  'RoadmapUsers',
  'RoadmapProjectLinks'
]);

// Allow /_api/contextinfo for digest retrieval
function isAllowedPath(path: string) {
  if (path === '/_api/contextinfo') return true;
  if (!path.startsWith('/_api/web/lists')) return false;
  const match = path.match(/getByTitle\('([^']+)'\)/);
  if (!match) return false;
  return ALLOWED_LISTS.has(match[1]);
}

// Basic in-process digest cache (optional, improves performance for writes)
interface DigestCacheEntry { value: string; expires: number; }
let digestCache: DigestCacheEntry | null = null;

async function getDigest(site: string, authHeaders: Record<string,string>): Promise<string> {
  const now = Date.now();
  if (digestCache && digestCache.expires > now) return digestCache.value;
  const r = await fetch(site.replace(/\/$/,'') + '/_api/contextinfo', {
    method: 'POST',
    headers: { 'Accept': 'application/json;odata=nometadata', ...authHeaders }
  });
  if (!r.ok) throw new Error('Failed to get contextinfo');
  const j = await r.json();
  digestCache = { value: j.FormDigestValue, expires: now + (j.FormDigestTimeoutSeconds * 1000) - 60000 };
  return digestCache.value;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const site = resolveSharePointSiteUrl();
  const segments = (req.query.sp as string[] | undefined) || [];
  const apiPath = '/' + segments.join('/');
  const qIndex = req.url?.indexOf('?') ?? -1;
  const query = qIndex >= 0 ? req.url!.substring(qIndex) : '';
  const fullPath = apiPath + query;

  if (!isAllowedPath(apiPath)) {
    return res.status(400).json({ error: 'Path not allowed' });
  }

  try {
    const authHeaders = await getSharePointAuthHeaders();
    const targetUrl = site.replace(/\/$/, '') + fullPath;

    const method = req.method || 'GET';
    const isWrite = ['POST','PATCH','MERGE','PUT','DELETE'].includes(method);
    const headers: Record<string,string> = {
      'Accept': 'application/json;odata=nometadata',
      'Content-Type': 'application/json;odata=nometadata',
      ...authHeaders,
    };

    if (isWrite && apiPath !== '/_api/contextinfo') {
      try {
        headers['X-RequestDigest'] = await getDigest(site, authHeaders);
      } catch (e) {
        console.warn('Digest retrieval failed', e);
      }
      // Support MERGE (update) if client sets X-HTTP-Method header externally (we could map here if needed)
      if (method === 'PATCH') {
        headers['IF-MATCH'] = '*';
        headers['X-HTTP-Method'] = 'MERGE';
      }
    }

    const spResp = await fetch(targetUrl, {
      method: method === 'PATCH' ? 'POST' : method, // SharePoint uses POST + X-HTTP-Method for MERGE
      headers,
      body: isWrite ? JSON.stringify(req.body) : undefined,
    });

    const raw = await spResp.text();
    const ct = spResp.headers.get('content-type') || '';
    let payload: any = raw;
    if (ct.includes('application/json')) {
      try { payload = JSON.parse(raw); } catch { /* swallow */ }
    }
    res.status(spResp.status).json(payload);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Proxy error' });
  }
}
