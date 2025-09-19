import type { NextApiRequest, NextApiResponse } from 'next';
import { resolveSharePointSiteUrl } from '@/utils/sharepointEnv';
import { getSharePointAuthHeaders } from '@/utils/spAuth';
import { sharePointHttpsAgent, sharePointDispatcher } from '@/utils/httpsAgent';

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
        try { chunks.push(new Uint8Array(chunk as ArrayBufferLike)); } catch { /* ignore */ }
      }
    });
    req.on('end', () => {
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0; for (const c of chunks) { merged.set(c, offset); offset += c.length; }
      resolve(merged);
    });
    req.on('error', reject);
  });
}

interface DigestCacheEntry { value: string; expires: number }
let digestCache: DigestCacheEntry | null = null;
async function getDigest(site: string, authHeaders: Record<string,string>): Promise<string> {
  const now = Date.now();
  if (digestCache && digestCache.expires > now) return digestCache.value;
  const r = await fetch(site.replace(/\/$/,'') + '/_api/contextinfo', {
    method: 'POST',
    headers: { 'Accept': 'application/json;odata=nometadata', 'Content-Length': '0', ...authHeaders },
    // @ts-ignore
    dispatcher: sharePointDispatcher ?? undefined,
    // @ts-ignore
    agent: sharePointHttpsAgent,
  });
  if (!r.ok) throw new Error('Failed to get contextinfo');
  const j = await r.json();
  digestCache = { value: j.FormDigestValue, expires: now + (j.FormDigestTimeoutSeconds * 1000) - 60000 };
  return digestCache.value;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const site = resolveSharePointSiteUrl();
  const { id } = req.query as { id: string };
  const name = (req.query.name as string) || '';

  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'Invalid id' });

  try {
    const auth = await getSharePointAuthHeaders();
    const base = site.replace(/\/$/, '') + `/_api/web/lists/getByTitle('RoadmapProjects')/items(${encodeURIComponent(id)})/AttachmentFiles`;

    if (req.method === 'GET') {
      const url = base + '?$select=FileName,ServerRelativeUrl';
      const r = await fetch(url, {
        headers: { 'Accept': 'application/json;odata=nometadata', ...auth },
        // @ts-ignore
        dispatcher: sharePointDispatcher ?? undefined,
        // @ts-ignore
        agent: sharePointHttpsAgent,
      });
      const txt = await r.text();
      const ct = r.headers.get('content-type') || '';
      let payload: any = txt;
      if (ct.includes('application/json')) { try { payload = JSON.parse(txt); } catch {} }
      if (!r.ok) return res.status(r.status).json({ error: 'sp-error', payload });
      return res.status(200).json(Array.isArray(payload?.value) ? payload.value : []);
    }

    if (req.method === 'POST') {
      if (!name) return res.status(400).json({ error: 'Missing name' });
      const digest = await getDigest(site, auth);
      const binary = await readRawBody(req);
      const url = base + `/add(FileName='${encodeURIComponent(name).replace(/'/g, "''")}')`;
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json;odata=nometadata',
          'Content-Type': 'application/octet-stream',
          'X-RequestDigest': digest,
          ...auth,
        },
        body: (binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength) as ArrayBuffer) as any,
        // @ts-ignore
        dispatcher: sharePointDispatcher ?? undefined,
        // @ts-ignore
        agent: sharePointHttpsAgent,
      });
      const ok = r.ok;
      const body = await r.text();
      if (!ok) return res.status(r.status).json({ error: 'sp-upload-failed', body });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      if (!name) return res.status(400).json({ error: 'Missing name' });
      const digest = await getDigest(site, auth);
      const url = base + `/getByFileName('${encodeURIComponent(name).replace(/'/g, "''")}')`;
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json;odata=nometadata',
          'Content-Type': 'application/json;odata=verbose',
          'X-RequestDigest': digest,
          'X-HTTP-Method': 'DELETE',
          'IF-MATCH': '*',
          ...auth,
        },
        // @ts-ignore
        dispatcher: sharePointDispatcher ?? undefined,
        // @ts-ignore
        agent: sharePointHttpsAgent,
      });
      const ok = r.ok;
      const body = await r.text();
      if (!ok) return res.status(r.status).json({ error: 'sp-delete-failed', body });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET,POST,DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'attachments error' });
  }
}
