import type { NextApiRequest, NextApiResponse } from 'next';
import { extname } from 'path';
import { clientDataService } from '@/utils/clientDataService';
import { requireAdminSession } from '@/utils/apiAuth';
import { resolveSharePointSiteUrl } from '@/utils/sharepointEnv';
import {
  getInstanceConfigFromRequest,
  INSTANCE_COOKIE_NAME,
  INSTANCE_QUERY_PARAM,
} from '@/utils/instanceConfig';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;

type AttachmentListItem = { FileName: string; ServerRelativeUrl: string };

const findAttachmentByName = (payload: unknown, name: string): AttachmentListItem | null => {
  if (!Array.isArray(payload)) return null;
  const expected = String(name).toLowerCase();
  for (const entry of payload) {
    const rec = asRecord(entry);
    if (!rec) continue;
    const fileName = typeof rec.FileName === 'string' ? rec.FileName : '';
    const serverRelativeUrl =
      typeof rec.ServerRelativeUrl === 'string' ? rec.ServerRelativeUrl : '';
    if (!fileName || !serverRelativeUrl) continue;
    if (fileName.toLowerCase() === expected)
      return { FileName: fileName, ServerRelativeUrl: serverRelativeUrl };
  }
  return null;
};

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

  try {
    requireAdminSession(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
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
    let response = await fetch(apiBase, {
      headers: attachHeaders({
        Accept: '*/*',
        Cookie: typeof req.headers.cookie === 'string' ? req.headers.cookie : '',
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      // Fallback for legacy farms / encoding issues: resolve ServerRelativeUrl then download by it
      try {
        const listUrl = withSlug(
          `${baseUrl}/api/attachments/${encodeURIComponent(id)}?${INSTANCE_QUERY_PARAM}=${encodeURIComponent(
            instance.slug
          )}`
        );
        const listResp = await fetch(listUrl, {
          headers: attachHeaders({ Accept: 'application/json' }),
        });
        const listJson = await listResp.json().catch(() => null);
        const match = findAttachmentByName(listJson, name);
        if (match?.ServerRelativeUrl) {
          const encodedServerRelative = encodeURI(String(match.ServerRelativeUrl)).replace(
            /'/g,
            "''"
          );
          const altPath = `${baseUrl}/api/sharepoint/_api/web/GetFileByServerRelativeUrl('${encodedServerRelative}')/$value`;
          response = await fetch(withSlug(altPath), {
            headers: attachHeaders({
              Accept: '*/*',
              Cookie: typeof req.headers.cookie === 'string' ? req.headers.cookie : '',
            }),
          });
        }
      } catch {
        /* ignore fallback errors */
      }

      if (!response.ok) {
        return res.status(response.status).json({ error: 'download-failed', detail });
      }
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

    const sniff = buffer
      .toString('utf8', 0, Math.min(buffer.length, 256))
      .replace(/^\uFEFF/, '')
      .trimStart();
    const looksLikeHtml = /^<!doctype\s+html|^<html\b|^<head\b|^<body\b|^<script\b|^<\?xml\b/i.test(
      sniff
    );
    const isDerivedImage =
      /^(image\/)i?/i.test(contentType) || /\.(jpe?g|png|gif|bmp|svg|webp)$/i.test(name);
    const ctIsOctet = /application\/octet-stream/i.test(contentType) || !contentType;

    // Some SharePoint farms/proxies respond with HTML (login/error) but with octet-stream.
    // In that case, redirect the browser to the direct SharePoint URL as a best-effort fallback.
    if ((ctIsOctet || isDerivedImage) && looksLikeHtml) {
      try {
        const listUrl = withSlug(
          `${baseUrl}/api/attachments/${encodeURIComponent(id)}?${INSTANCE_QUERY_PARAM}=${encodeURIComponent(
            instance.slug
          )}`
        );
        const listResp = await fetch(listUrl, {
          headers: attachHeaders({ Accept: 'application/json' }),
        });
        const listJson = await listResp.json().catch(() => null);
        const match = findAttachmentByName(listJson, name);
        if (match?.ServerRelativeUrl) {
          const spSite = resolveSharePointSiteUrl(instance);
          const spOrigin = new URL(spSite).origin;
          const serverRel = String(match.ServerRelativeUrl);
          const direct = new URL(serverRel, spOrigin).toString();
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.setHeader('Location', direct);
          return res.status(302).end();
        }
      } catch {
        /* ignore redirect fallback */
      }
      // If redirect fallback fails, return the text snippet for debugging instead of a broken image.
      return res.status(502).json({ error: 'download-invalid-binary', snippet: sniff });
    }
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
