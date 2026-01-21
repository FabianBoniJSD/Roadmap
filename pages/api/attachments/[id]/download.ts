import type { NextApiRequest, NextApiResponse } from 'next';
import { extname } from 'path';
import { clientDataService } from '@/utils/clientDataService';
import {
  getInstanceConfigFromRequest,
  INSTANCE_COOKIE_NAME,
  INSTANCE_QUERY_PARAM,
} from '@/utils/instanceConfig';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

const mimeByExtension: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query as { id?: string };
  const name = req.query.name as string | undefined;

  if (!id || Array.isArray(id) || !name) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    let instance: RoadmapInstanceConfig | null = null;
    try {
      instance = await getInstanceConfigFromRequest(req, { fallbackToDefault: false });
    } catch (error) {
      console.error('[attachments:download] failed to resolve instance', error);
      return res.status(500).json({ error: 'Failed to resolve roadmap instance' });
    }
    if (!instance) {
      return res.status(404).json({ error: 'No roadmap instance configured for this request' });
    }

    let listTitle = 'RoadmapProjects';
    try {
      listTitle = await clientDataService.withInstance(instance.slug, () =>
        clientDataService.resolveListTitle('RoadmapProjects', ['Roadmap Projects'])
      );
    } catch (err) {
      console.warn('[attachments:download] failed to resolve list title', err);
    }
    const encodedTitle = encodeURIComponent(listTitle);

    const baseUrl =
      (process.env.INTERNAL_API_BASE_URL || '').replace(/\/$/, '') ||
      `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers['x-forwarded-host'] || req.headers.host}`;
    const basePath = `/api/sharepoint/_api/web/lists/getByTitle('${encodedTitle}')/items(${encodeURIComponent(
      id
    )})/AttachmentFiles/getByFileName('${encodeURIComponent(name).replace(/'/g, "''")}')/$value`;
    const withSlug = (rawUrl: string) => {
      try {
        const urlObj = new URL(rawUrl);
        urlObj.searchParams.set(INSTANCE_QUERY_PARAM, instance!.slug);
        return urlObj.toString();
      } catch {
        return rawUrl.includes('?')
          ? `${rawUrl}&${INSTANCE_QUERY_PARAM}=${encodeURIComponent(instance!.slug)}`
          : `${rawUrl}?${INSTANCE_QUERY_PARAM}=${encodeURIComponent(instance!.slug)}`;
      }
    };
    const attachHeaders = (headers: HeadersInit = {}) => {
      const h = new Headers(headers);
      h.set('x-roadmap-instance', instance!.slug);
      const cookieValue = `${INSTANCE_COOKIE_NAME}=${instance!.slug}`;
      const existingCookie = h.get('cookie');
      if (existingCookie) {
        const segments = existingCookie
          .split(';')
          .map((segment) => segment.trim())
          .filter(Boolean)
          .filter((segment) => !segment.toLowerCase().startsWith(`${INSTANCE_COOKIE_NAME}=`));
        segments.push(cookieValue);
        h.set('cookie', segments.join('; '));
      } else {
        h.set('cookie', cookieValue);
      }
      return h;
    };

    const apiBase = withSlug(baseUrl + basePath);
    const response = await fetch(apiBase, {
      headers: attachHeaders({
        Accept: '*/*',
        Cookie: typeof req.headers.cookie === 'string' ? req.headers.cookie : '',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'download-failed', detail: text });
    }
    let contentType = response.headers.get('content-type') || '';
    const originalDisposition = response.headers.get('content-disposition') || '';
    const inlineDisposition = originalDisposition
      ? originalDisposition.replace(/^attachment/i, 'inline')
      : `inline; filename="${name}"`;

    if (!contentType || /application\/octet-stream/i.test(contentType)) {
      const ext = extname(name).toLowerCase();
      if (ext && mimeByExtension[ext]) {
        contentType = mimeByExtension[ext];
      } else {
        contentType = 'application/octet-stream';
      }
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.status(response.status);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', inlineDisposition);
    const length = response.headers.get('content-length');
    const etag = response.headers.get('etag');
    const lastModified = response.headers.get('last-modified');
    if (length) res.setHeader('Content-Length', length);
    if (etag) res.setHeader('ETag', etag);
    if (lastModified) res.setHeader('Last-Modified', lastModified);
    res.end(buffer);
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'download error';
    return res.status(500).json({ error: message });
  }
}
