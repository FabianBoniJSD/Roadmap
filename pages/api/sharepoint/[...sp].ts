import type { NextApiRequest, NextApiResponse } from 'next';
import { resolveSharePointSiteUrl } from '@/utils/sharepointEnv';

// Allowlisting only specific list endpoints to limit exposure
const ALLOWED_LISTS = [
  'RoadmapProjects',
  'RoadmapCategories',
  'RoadmapSettings',
  'RoadmapFieldTypes',
  'RoadmapFields',
  'RoadmapTeamMembers',
  'RoadmapUsers',
  'RoadmapProjectLinks'
];

function isAllowed(path: string) {
  if (!path.startsWith('/_api/web/lists')) return false;
  // crude extraction of list title inside getByTitle('X')
  const match = path.match(/getByTitle\('([^']+)'\)/);
  if (!match) return false;
  return ALLOWED_LISTS.includes(match[1]);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const site = resolveSharePointSiteUrl();
  const pathSegments = (req.query.sp as string[] | undefined) || [];
  const apiPath = '/' + pathSegments.join('/');
  const queryIndex = req.url?.indexOf('?') ?? -1;
  const query = queryIndex >= 0 ? req.url?.substring(queryIndex) : '';
  const fullPath = apiPath + (query || '');

  if (!isAllowed(fullPath)) {
    return res.status(400).json({ error: 'Path not allowed' });
  }

  try {
    const targetUrl = site.replace(/\/$/, '') + fullPath;

    const spResp = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Accept': 'application/json;odata=nometadata',
        'Content-Type': 'application/json;odata=nometadata'
      },
      // NOTE: If SharePoint requires auth cookies, and this server runs under same domain with cookies available, add:
      // credentials: 'include'
      body: ['POST','PATCH','MERGE','PUT','DELETE'].includes(req.method || '') ? JSON.stringify(req.body) : undefined
    });

    const text = await spResp.text();
    const contentType = spResp.headers.get('content-type') || '';
    let data: any = text;
    if (contentType.includes('application/json')) {
      try { data = JSON.parse(text); } catch { /* ignore parse errors */ }
    }

    // Pass through status & data
    res.status(spResp.status).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Proxy error' });
  }
}
