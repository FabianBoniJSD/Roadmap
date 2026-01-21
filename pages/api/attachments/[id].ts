import type { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';
import {
  getInstanceConfigFromRequest,
  INSTANCE_COOKIE_NAME,
  INSTANCE_QUERY_PARAM,
} from '@/utils/instanceConfig';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: NextApiRequest): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  return await new Promise((resolve, reject) => {
    req.on('data', (chunk: unknown) => {
      if (chunk instanceof Uint8Array) chunks.push(chunk);
      else if (typeof chunk === 'string') chunks.push(new TextEncoder().encode(chunk));
      else if (chunk) {
        try {
          chunks.push(new Uint8Array(chunk as ArrayBufferLike));
        } catch {
          /* ignore */
        }
      }
    });
    req.on('end', () => {
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      resolve(merged);
    });
    req.on('error', reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const name = (req.query.name as string) || '';

  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'Invalid id' });

  try {
    let instance: RoadmapInstanceConfig | null = null;
    try {
      instance = await getInstanceConfigFromRequest(req, { fallbackToDefault: false });
    } catch (error) {
      console.error('[api/attachments] failed to resolve instance', error);
      return res.status(500).json({ error: 'Failed to resolve roadmap instance' });
    }
    if (!instance) {
      return res.status(404).json({ error: 'No roadmap instance configured for this request' });
    }

    const baseUrl =
      (process.env.INTERNAL_API_BASE_URL || '').replace(/\/$/, '') ||
      `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers['x-forwarded-host'] || req.headers.host}`;
    let listTitle = 'RoadmapProjects';
    try {
      listTitle = await clientDataService.withInstance(instance.slug, () =>
        clientDataService.resolveListTitle('RoadmapProjects', ['Roadmap Projects'])
      );
    } catch (err) {
      console.warn('[api/attachments] failed to resolve list title', err);
    }
    const encodedTitle = encodeURIComponent(listTitle);
    const basePath = `/api/sharepoint/_api/web/lists/getByTitle('${encodedTitle}')/items(${encodeURIComponent(
      id
    )})/AttachmentFiles`;
    const base = `${baseUrl}${basePath}`;

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

    if (req.method === 'GET') {
      const url = withSlug(base + '?$select=FileName,ServerRelativeUrl');
      const r = await fetch(url, {
        headers: attachHeaders({ Accept: 'application/json;odata=nometadata' }),
      });
      const txt = await r.text();
      const ct = r.headers.get('content-type') || '';
      let payload: unknown = txt;
      if (ct.includes('application/json')) {
        try {
          payload = JSON.parse(txt);
        } catch {
          /* ignore parse errors */
        }
      }
      if (!r.ok) {
        return res.status(r.status).json({ error: 'sp-error', payload });
      }
      const value =
        typeof payload === 'object' && payload !== null && 'value' in payload
          ? (payload as { value?: unknown }).value
          : undefined;
      return res.status(200).json(Array.isArray(value) ? value : []);
    }

    if (req.method === 'POST') {
      if (!name) return res.status(400).json({ error: 'Missing name' });
      const binary = await readRawBody(req);
      const url = withSlug(
        base + `/add(FileName='${encodeURIComponent(name).replace(/'/g, "''")}')`
      );
      const r = await fetch(url, {
        method: 'POST',
        headers: attachHeaders({
          Accept: 'application/json;odata=nometadata',
          'Content-Type': 'application/octet-stream',
        }),
        body: binary.buffer.slice(
          binary.byteOffset,
          binary.byteOffset + binary.byteLength
        ) as ArrayBuffer,
      });
      const ok = r.ok;
      const body = await r.text();
      if (!ok) return res.status(r.status).json({ error: 'sp-upload-failed', body });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      if (!name) return res.status(400).json({ error: 'Missing name' });
      const url = withSlug(
        base + `/getByFileName('${encodeURIComponent(name).replace(/'/g, "''")}')`
      );
      const r = await fetch(url, {
        method: 'POST',
        headers: attachHeaders({
          Accept: 'application/json;odata=nometadata',
          'Content-Type': 'application/json;odata=verbose',
          'X-HTTP-Method': 'DELETE',
          'IF-MATCH': '*',
        }),
      });
      const ok = r.ok;
      const body = await r.text();
      if (!ok) return res.status(r.status).json({ error: 'sp-delete-failed', body });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET,POST,DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'attachments error';
    return res.status(500).json({ error: message });
  }
}
