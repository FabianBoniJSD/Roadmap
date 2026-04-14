import type { NextApiRequest, NextApiResponse } from 'next';
import { requireUserSession } from '@/utils/apiAuth';
import { isReadSessionAllowedForInstance } from '@/utils/instanceAccessServer';
import {
  getInstanceConfigFromRequest,
  INSTANCE_COOKIE_NAME,
  INSTANCE_QUERY_PARAM,
} from '@/utils/instanceConfig';
import { prefixBasePath } from '@/utils/nextBasePath';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

const USERPHOTO_PATH_REGEX = /^\/_layouts\/15\/userphoto\.aspx(?:\?.*)?$/i;
const PROFILE_PICTURE_LIBRARY_REGEX = /^\/.*\/User(?:%20| )Photos\/Profile(?:%20| )Pictures\/.*$/i;

const normalizeRequestedPath = (value: string): string | null => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (USERPHOTO_PATH_REGEX.test(withLeadingSlash)) return withLeadingSlash;
  if (PROFILE_PICTURE_LIBRARY_REGEX.test(withLeadingSlash)) return withLeadingSlash;
  return null;
};

const withInstanceSlug = (rawUrl: string, slug: string) => {
  try {
    const url = new URL(rawUrl);
    url.searchParams.set(INSTANCE_QUERY_PARAM, slug);
    return url.toString();
  } catch {
    return rawUrl.includes('?')
      ? `${rawUrl}&${INSTANCE_QUERY_PARAM}=${encodeURIComponent(slug)}`
      : `${rawUrl}?${INSTANCE_QUERY_PARAM}=${encodeURIComponent(slug)}`;
  }
};

const buildForwardedHeaders = (req: NextApiRequest, instance: RoadmapInstanceConfig) => {
  const headers = new Headers();
  headers.set('Accept', '*/*');
  headers.set('x-roadmap-instance', instance.slug);

  const cookieValue = `${INSTANCE_COOKIE_NAME}=${instance.slug}`;
  const incomingCookie = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
  if (incomingCookie) {
    const segments = incomingCookie
      .split(';')
      .map((segment) => segment.trim())
      .filter(Boolean)
      .filter((segment) => !segment.toLowerCase().startsWith(`${INSTANCE_COOKIE_NAME}=`));
    segments.push(cookieValue);
    headers.set('cookie', segments.join('; '));
  } else {
    headers.set('cookie', cookieValue);
  }

  if (typeof req.headers.authorization === 'string' && req.headers.authorization.trim()) {
    headers.set('authorization', req.headers.authorization);
  }

  return headers;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let session: ReturnType<typeof requireUserSession>;
  try {
    session = requireUserSession(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let instance: RoadmapInstanceConfig | null = null;
  try {
    instance = await getInstanceConfigFromRequest(req);
  } catch (error) {
    console.error('[user-photo] failed to resolve instance', error);
    return res.status(500).json({ error: 'Failed to resolve roadmap instance' });
  }

  if (!instance) {
    return res.status(404).json({ error: 'No roadmap instance configured for this request' });
  }

  const requestHeaders = {
    authorization:
      typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
    cookie: typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined,
  };

  if (
    !(await isReadSessionAllowedForInstance({
      session,
      instance,
      requestHeaders,
    }))
  ) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const rawPath = typeof req.query.path === 'string' ? req.query.path : '';
  const rawAccountName = typeof req.query.accountname === 'string' ? req.query.accountname : '';
  const size =
    typeof req.query.size === 'string' && /^[sml]$/i.test(req.query.size)
      ? req.query.size.toUpperCase()
      : 'L';

  const normalizedPath = rawPath ? normalizeRequestedPath(rawPath) : null;
  if (!normalizedPath && !rawAccountName.trim()) {
    return res.status(400).json({ error: 'Missing user photo path or account name' });
  }

  const proxyPath =
    normalizedPath ||
    `/_layouts/15/userphoto.aspx?size=${encodeURIComponent(size)}&accountname=${encodeURIComponent(rawAccountName.trim())}`;

  const baseUrl =
    (process.env.INTERNAL_API_BASE_URL || '').replace(/\/$/, '') || 'http://localhost:3000';
  const internalUrl = withInstanceSlug(
    `${baseUrl}${prefixBasePath('/api/sharepoint')}${proxyPath}`,
    instance.slug
  );

  try {
    const response = await fetch(internalUrl, {
      method: 'GET',
      headers: buildForwardedHeaders(req, instance),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return res.status(response.status).send(detail || 'User photo request failed');
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const contentLength = response.headers.get('content-length');
    const cacheControl = response.headers.get('cache-control') || 'private, max-age=300';
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', cacheControl);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('[user-photo] failed to fetch internal sharepoint photo', error);
    return res.status(500).json({ error: 'Failed to fetch user photo' });
  }
}
