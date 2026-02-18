import type { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';
import { requireAdminSession } from '@/utils/apiAuth';
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

const encodeServerRelativeUrl = (value: string): string => encodeURI(value).replace(/'/g, "''");

const extractJsonPayload = (raw: string, contentType: string): unknown => {
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const getNested = (value: unknown, path: string[]): unknown => {
  let current: unknown = value;
  for (const key of path) {
    const obj = asRecord(current);
    if (!obj) return undefined;
    current = obj[key];
  }
  return current;
};

type AttachmentFile = { FileName: string; ServerRelativeUrl: string };

const coerceAttachmentFile = (value: unknown): AttachmentFile | null => {
  const rec = asRecord(value);
  if (!rec) return null;
  const fileName = typeof rec.FileName === 'string' ? rec.FileName : null;
  const serverRelativeUrl =
    typeof rec.ServerRelativeUrl === 'string' ? rec.ServerRelativeUrl : null;
  if (!fileName || !serverRelativeUrl) return null;
  return { FileName: fileName, ServerRelativeUrl: serverRelativeUrl };
};

const extractAttachmentArray = (payload: unknown): AttachmentFile[] => {
  const direct = asRecord(payload);
  const value = direct?.value;
  if (Array.isArray(value)) {
    return value.map(coerceAttachmentFile).filter((v): v is AttachmentFile => Boolean(v));
  }

  const results = getNested(payload, ['d', 'results']);
  if (Array.isArray(results)) {
    return results.map(coerceAttachmentFile).filter((v): v is AttachmentFile => Boolean(v));
  }

  return [];
};

const shouldRetryAsLegacy = (status: number, bodyText: string) => {
  if (status === 400) return true;
  return /InvalidClientQuery|Invalid argument|OData\s+version|unsupported/i.test(bodyText);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const name = (req.query.name as string) || '';

  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'Invalid id' });

  try {
    requireAdminSession(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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

    const listInfoUrl = `${baseUrl}/api/sharepoint/_api/web/lists/getByTitle('${encodedTitle}')?$select=RootFolder/ServerRelativeUrl&$expand=RootFolder`;

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

    const getRootFolderUrl = async (): Promise<string> => {
      const url = withSlug(listInfoUrl);
      const r = await fetch(url, {
        headers: attachHeaders({ Accept: 'application/json;odata=nometadata' }),
      });
      const txt = await r.text();
      const payload = extractJsonPayload(txt, r.headers.get('content-type') || '');
      if (!r.ok) {
        throw new Error(`list-root-folder-failed:${r.status}`);
      }
      const rootUrl = (getNested(payload, ['RootFolder', 'ServerRelativeUrl']) ??
        getNested(payload, ['d', 'RootFolder', 'ServerRelativeUrl']) ??
        '') as unknown;
      if (!rootUrl) throw new Error('list-root-folder-missing');
      return String(rootUrl);
    };

    const ensureAttachmentFolder = async (rootFolderUrl: string) => {
      const parent = `${rootFolderUrl.replace(/\/$/, '')}/Attachments`;
      const url = withSlug(
        `${baseUrl}/api/sharepoint/_api/web/GetFolderByServerRelativeUrl('${encodeServerRelativeUrl(
          parent
        )}')/Folders/add('${encodeURIComponent(id)}')`
      );
      const r = await fetch(url, {
        method: 'POST',
        headers: attachHeaders({
          Accept: 'application/json;odata=nometadata',
          'Content-Type': 'application/json;odata=verbose',
        }),
      });
      if (!r.ok && r.status !== 409) {
        const body = await r.text();
        throw new Error(`attachments-folder-failed:${r.status}:${body}`);
      }
    };

    if (req.method === 'GET') {
      const baseListUrl = withSlug(base + '?$select=FileName,ServerRelativeUrl');

      const tryFetch = async (accept: string) => {
        const r = await fetch(baseListUrl, {
          headers: attachHeaders({ Accept: accept }),
        });
        const txt = await r.text();
        const ct = r.headers.get('content-type') || '';
        const payload = extractJsonPayload(txt, ct);
        return { r, txt, ct, payload };
      };

      // 1) nometadata
      let attempt = await tryFetch('application/json;odata=nometadata');
      if (!attempt.r.ok && shouldRetryAsLegacy(attempt.r.status, String(attempt.txt || ''))) {
        // 2) verbose JSON
        attempt = await tryFetch('application/json;odata=verbose');
      }
      if (!attempt.r.ok && shouldRetryAsLegacy(attempt.r.status, String(attempt.txt || ''))) {
        // 3) Atom XML
        const atomUrl = baseListUrl;
        const atomResp = await fetch(atomUrl, {
          headers: attachHeaders({ Accept: 'application/atom+xml' }),
        });
        const atomText = await atomResp.text();
        if (!atomResp.ok) {
          return res.status(atomResp.status).json({ error: 'sp-error', payload: atomText });
        }
        // Minimal Atom parser for attachments
        try {
          const entries = atomText.match(/<entry[\s\S]*?<\/entry>/gi) || [];
          const items = entries
            .map((entry) => {
              const fileNameMatch = entry.match(/<d:FileName[^>]*>([\s\S]*?)<\/d:FileName>/i);
              const urlMatch = entry.match(
                /<d:ServerRelativeUrl[^>]*>([\s\S]*?)<\/d:ServerRelativeUrl>/i
              );
              const FileName = fileNameMatch?.[1]?.trim() || '';
              const ServerRelativeUrl = urlMatch?.[1]?.trim() || '';
              return FileName && ServerRelativeUrl ? { FileName, ServerRelativeUrl } : null;
            })
            .filter(Boolean);
          return res.status(200).json(items);
        } catch {
          return res.status(200).json([]);
        }
      }

      if (!attempt.r.ok) {
        return res.status(attempt.r.status).json({ error: 'sp-error', payload: attempt.payload });
      }
      const attachments = extractAttachmentArray(attempt.payload);
      return res.status(200).json(Array.isArray(attachments) ? attachments : []);
    }

    if (req.method === 'POST') {
      if (!name) return res.status(400).json({ error: 'Missing name' });
      const isChunked = String(req.query.chunked || '').toLowerCase() === '1';
      if (isChunked) {
        const actionRaw = req.query.action;
        const action = Array.isArray(actionRaw) ? actionRaw[0] : actionRaw;
        const uploadIdRaw = req.query.uploadId;
        const uploadId = Array.isArray(uploadIdRaw) ? uploadIdRaw[0] : uploadIdRaw;
        const offsetRaw = req.query.offset;
        const offset = Number(Array.isArray(offsetRaw) ? offsetRaw[0] : offsetRaw || 0);

        if (!action || !uploadId || Number.isNaN(offset)) {
          return res.status(400).json({ error: 'Missing chunked upload parameters' });
        }

        const binary = await readRawBody(req);
        let rootFolderUrl = '';
        try {
          rootFolderUrl = await getRootFolderUrl();
          await ensureAttachmentFolder(rootFolderUrl);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'attachment-folder-error';
          return res.status(500).json({ error: msg });
        }

        const fileUrl = `${rootFolderUrl.replace(/\/$/, '')}/Attachments/${id}/${name}`;
        const encodedFileUrl = encodeServerRelativeUrl(fileUrl);
        const apiBase = `${baseUrl}/api/sharepoint/_api/web/GetFileByServerRelativeUrl('${encodedFileUrl}')`;

        let spEndpoint = '';
        if (action === 'start') {
          spEndpoint = `${apiBase}/StartUpload(uploadId=guid'${uploadId}')`;
        } else if (action === 'continue') {
          spEndpoint = `${apiBase}/ContinueUpload(uploadId=guid'${uploadId}',fileOffset=${offset})`;
        } else if (action === 'finish') {
          spEndpoint = `${apiBase}/FinishUpload(uploadId=guid'${uploadId}',fileOffset=${offset})`;
        } else {
          return res.status(400).json({ error: 'Invalid chunked action' });
        }

        const r = await fetch(withSlug(spEndpoint), {
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
        const bodyText = await r.text();
        if (!r.ok) {
          return res.status(r.status).json({ error: 'sp-upload-failed', body: bodyText });
        }

        const payload = extractJsonPayload(bodyText, r.headers.get('content-type') || '');
        const nextOffset =
          getNested(payload, ['value']) ??
          getNested(payload, ['d', 'StartUpload']) ??
          getNested(payload, ['d', 'ContinueUpload']) ??
          getNested(payload, ['d', 'FinishUpload']) ??
          undefined;

        return res.status(200).json({ ok: true, nextOffset });
      }

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
