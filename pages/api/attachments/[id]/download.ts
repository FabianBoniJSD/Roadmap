import type { NextApiRequest, NextApiResponse } from 'next';
import { extname } from 'path';

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
  '.zip': 'application/zip'
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
    const baseUrl = (process.env.INTERNAL_API_BASE_URL || '').replace(/\/$/, '') || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers['x-forwarded-host'] || req.headers.host}`;
    const apiBase = baseUrl + `/api/sharepoint/_api/web/lists/getByTitle('RoadmapProjects')/items(${encodeURIComponent(id)})/AttachmentFiles/getByFileName('${encodeURIComponent(name).replace(/'/g, "''")}')/$value`;
    const response = await fetch(apiBase, {
      headers: {
        Accept: '*/*',
        Cookie: typeof req.headers.cookie === 'string' ? req.headers.cookie : '',
      },
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
