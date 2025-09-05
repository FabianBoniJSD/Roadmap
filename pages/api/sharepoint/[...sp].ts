import type { NextApiRequest, NextApiResponse } from 'next';
import { resolveSharePointSiteUrl } from '@/utils/sharepointEnv';
import { getSharePointAuthHeaders } from '@/utils/spAuth';
import { sharePointHttpsAgent, sharePointDispatcher } from '@/utils/httpsAgent';
// @ts-ignore child_process without node types in some build envs
const { execFile } = require('child_process');

// Simple in-memory cache for curl mode GET responses
interface CurlCacheEntry { expires: number; payload: any }
const curlCache: Record<string, CurlCacheEntry> = {};
const invalidateCurlCache = () => {
  for (const k of Object.keys(curlCache)) delete curlCache[k];
};

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
  // Normalize trailing slashes (except root) so /_api/contextinfo/ is treated like /_api/contextinfo
  const cleaned = path.endsWith('/') ? path.replace(/\/+$/,'') : path;
  if (cleaned === '/_api/contextinfo') return true;
  // Allow current user lookup for authentication checks
  if (cleaned === '/_api/web/currentuser') return true;
  // Optional debug allowance to enumerate lists (avoids needing a specific list) ONLY when SP_PROXY_DEBUG enabled
  // @ts-ignore
  if (process.env.SP_PROXY_DEBUG === 'true' && cleaned === '/_api/web/lists') return true;
  if (!cleaned.startsWith('/_api/web/lists')) return false;
  const match = cleaned.match(/getByTitle\('([^']+)'\)/);
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
    headers: { 'Accept': 'application/json;odata=nometadata', 'Content-Length': '0', ...authHeaders },
    // @ts-ignore undici fetch supports dispatcher
    dispatcher: sharePointDispatcher ?? undefined,
    // Fallback for older node-fetch semantics (should be ignored by undici)
    // @ts-ignore
    agent: sharePointHttpsAgent
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
  // Preserve raw encoded query string; earlier decoding attempts may trigger 'Invalid argument' before request
  let query = '';
  if (qIndex >= 0) query = req.url!.substring(qIndex); // includes leading '?'
  let fullPath = apiPath + query;
  // Some on-prem SharePoint builds reject /items/ (trailing slash) before query params; normalize to /items
  fullPath = fullPath.replace(/\/items\/\?/, '/items?');
  // Optionally decode %24 (encoded $) in OData system query option names (e.g. %24select -> $select)
  // Controlled via SP_DECODE_DOLLAR to allow experimentation without redeploy.
  // @ts-ignore
  if (process.env.SP_DECODE_DOLLAR === 'true') {
    fullPath = fullPath.replace(/%24([a-zA-Z]+)/g, (_m, g1) => '$' + g1);
  }
  // Use runtime env flag only if available (avoid type issues in certain build analyzers)
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env.SP_PROXY_DEBUG === 'true') {
    // eslint-disable-next-line no-console
    console.debug('[sharepoint proxy] original url:', req.url, '-> decoded fullPath:', fullPath);
  }

  if (!isAllowedPath(apiPath)) {
    return res.status(400).json({ error: 'Path not allowed' });
  }

  try {
    // Optional curl path (replicates working system curl NTLM handshake). Enabled via SP_USE_CURL=true
    if (process.env.SP_USE_CURL === 'true') {
      const username = process.env.SP_USERNAME || '';
      const password = process.env.SP_PASSWORD || '';
      if (!username || !password) return res.status(500).json({ error: 'Missing SP_USERNAME/SP_PASSWORD for curl mode' });
      const domain = process.env.SP_ONPREM_DOMAIN || (username.includes('\\') ? username.split('\\')[0] : '');
      const userPart = username.includes('\\') ? username.split('\\')[1] : username;
      const cred = domain ? `${domain}\\${userPart}:${password}` : `${userPart}:${password}`;
      const targetUrl = site.replace(/\/$/, '') + fullPath;
      const clientAccept = typeof req.headers['accept'] === 'string' ? req.headers['accept'] : 'application/json;odata=nometadata';
      const cacheSeconds = parseInt(process.env.SP_CURL_CACHE_SECONDS || '60', 10);
      const cacheKey = 'GET:' + targetUrl + '|' + clientAccept;
      if (req.method === 'GET' && cacheSeconds > 0) {
        const ent = curlCache[cacheKey];
        if (ent && ent.expires > Date.now()) {
          return res.status(200).json({ ...ent.payload, mode: 'curl', cached: true });
        }
      }
      // Handle POST (contextinfo or list operations) minimal implementation
      if (req.method !== 'GET') {
        const isContextInfo = /_api\/contextinfo/i.test(fullPath);
        const method = req.method.toUpperCase();
        const curlArgs: string[] = ['-sS', '--ntlm', '--user', cred, '-X', method, '-H', `Accept: ${clientAccept}`];
        if (isContextInfo || method === 'POST') {
          // SharePoint expects a body for contextinfo but empty body works
          curlArgs.push('-H', 'Content-Type: application/json;odata=verbose', '--data', '');
        } else if (method === 'MERGE' || method === 'PATCH') {
          curlArgs.push('-H', 'IF-MATCH: *', '-H', 'X-HTTP-Method: MERGE');
        } else if (method === 'DELETE') {
          curlArgs.push('-H', 'IF-MATCH: *');
        }
        curlArgs.push(targetUrl);
        if (process.env.SP_ALLOW_SELF_SIGNED === 'true') curlArgs.unshift('-k');
        if (process.env.SP_CURL_VERBOSE === 'true') curlArgs.unshift('-v');
  // @ts-ignore node dynamic require
  const { execFile } = require('child_process');
        try {
          const output: { stdout: string; stderr: string } = await new Promise((resolveExec, rejectExec) => {
            execFile('curl', curlArgs, { timeout: 20000 }, (err: any, stdout: string, stderr: string) => {
              if (err) return rejectExec(Object.assign(err, { stderr }));
              resolveExec({ stdout, stderr });
            });
          });
          let parsed: any = output.stdout;
            try { parsed = JSON.parse(output.stdout); } catch { /* ignore */ }
          res.setHeader('x-sp-proxy-mode','curl');
          if (process.env.SP_CURL_VERBOSE==='true') res.setHeader('x-sp-proxy-ntlm','1');
          // Invalidate cache on any write
          invalidateCurlCache();
          return res.status(200).json(parsed);
        } catch (e: any) {
          return res.status(500).json({ error: 'curl-post-failed', detail: e.message, stderr: e.stderr });
        }
      }
      // Sanitize allowed path already checked earlier; still ensure no shell injection (use execFile arg array)
      const curlArgs = [
        '-sS', '--ntlm', '--user', cred,
        '--connect-timeout', '5', '--retry', '1',
        '-H', `Accept: ${clientAccept}`,
        targetUrl
      ];
      if (process.env.SP_ALLOW_SELF_SIGNED === 'true') curlArgs.unshift('-k');
      if (process.env.SP_CURL_VERBOSE === 'true') curlArgs.unshift('-v');
      const start = Date.now();
      const output: { stdout: string; stderr: string } = await new Promise((resolveExec, rejectExec) => {
        execFile('curl', curlArgs, { timeout: 15000 }, (err: any, stdout: string, stderr: string) => {
          if (err) return rejectExec(Object.assign(err, { stderr }));
          resolveExec({ stdout, stderr });
        });
      });
      const duration = Date.now() - start;
      let rawOut = output.stdout;
      let normalized: any = null;
      // Attempt JSON parse first if looks like JSON
      if (/^\s*\{/.test(rawOut)) {
        try { normalized = JSON.parse(rawOut); } catch { /* ignore */ }
      }
      if (!normalized) {
        // Atom/XML -> lightweight normalization (Ids + Title + selected fields if present)
        if (/^\s*<\?xml/.test(rawOut) && /<feed/i.test(rawOut)) {
          try {
            const entries = rawOut.match(/<m:properties>[\s\S]*?<\/m:properties>/g) || [];
            const items: Record<string, any>[] = [];
            for (const block of entries) {
              const idMatch = block.match(/<d:Id[^>]*>(\d+)<\/d:Id>/i) || block.match(/<d:ID[^>]*>(\d+)<\/d:ID>/i);
              const titleMatch = block.match(/<d:Title>([\s\S]*?)<\/d:Title>/i);
              const item: any = { Id: idMatch ? parseInt(idMatch[1], 10) : undefined, Title: titleMatch ? titleMatch[1] : '' };
              // Grab any simple string/integer additional fields requested via $select (rudimentary)
              const fieldMatches = block.match(/<d:([A-Za-z0-9_]+)[^>]*>([\s\S]*?)<\/d:\1>/g) || [];
              for (const fm of fieldMatches) {
                const m = fm.match(/<d:([A-Za-z0-9_]+)[^>]*>([\s\S]*?)<\/d:\1>/);
                if (!m) continue;
                const name = m[1];
                if (name === 'Id' || name === 'ID' || name === 'Title') continue;
                const value = m[2];
                if (!/[<>]/.test(value)) item[name] = value; // skip nested complex
              }
              items.push(item);
            }
            normalized = { d: { results: items } };
          } catch { /* ignore */ }
        }
      }
      if (!normalized) normalized = rawOut; // fallback raw
      if (typeof normalized === 'string' && /<html/i.test(normalized) && /401/i.test(normalized)) {
        return res.status(401).json({ error: 'Unauthorized (curl)', snippet: normalized.substring(0,160), stderr: process.env.SP_CURL_VERBOSE==='true'? output.stderr : undefined });
      }
      // Shape response to look like native SharePoint depending on Accept header
      const wantsNoMeta = /odata=nometadata/i.test(clientAccept);
      let bodyToSend: any = normalized;
      if (normalized && typeof normalized === 'object' && !Array.isArray(normalized)) {
        if ((normalized as any).d && (normalized as any).d.results && wantsNoMeta) {
          bodyToSend = { value: (normalized as any).d.results };
        } else if (Array.isArray((normalized as any).d)) {
          bodyToSend = wantsNoMeta ? { value: (normalized as any).d } : normalized;
        }
      } else if (Array.isArray(normalized)) {
        bodyToSend = wantsNoMeta ? { value: normalized } : { d: { results: normalized } };
      }
      // Provide minimal telemetry via headers
      res.setHeader('x-sp-proxy-mode','curl');
      res.setHeader('x-sp-proxy-ms', String(duration));
      if (process.env.SP_CURL_VERBOSE==='true') res.setHeader('x-sp-proxy-ntlm','1');
      if (req.method === 'GET' && cacheSeconds > 0) {
        curlCache[cacheKey] = { expires: Date.now() + cacheSeconds * 1000, payload: bodyToSend };
      }
      return res.status(200).json(bodyToSend);
    }

    const authHeaders = await getSharePointAuthHeaders();
    const targetUrl = site.replace(/\/$/, '') + fullPath;

    const method = req.method || 'GET';
    const isWrite = ['POST','PATCH','MERGE','PUT','DELETE'].includes(method);
    // Forward client's Accept when possible to preserve expected payload shape (nometadata vs verbose)
    const clientAccept = req.headers['accept'];
    const headers: Record<string,string> = {
      'Accept': typeof clientAccept === 'string' ? clientAccept : 'application/json;odata=nometadata',
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

    const effectiveMethod = method === 'PATCH' ? 'POST' : method;
    const doFetch = async (acceptOverride?: string) => {
      const h = { ...headers };
      if (acceptOverride) h['Accept'] = acceptOverride;
      return fetch(targetUrl, {
        method: effectiveMethod,
        headers: h,
        body: isWrite ? JSON.stringify(req.body) : undefined,
        // @ts-ignore undici dispatcher (may be root cause for 'Invalid argument' in some builds; keep but could disable via env)
        dispatcher: process.env.SP_DISABLE_DISPATCHER === 'true' ? undefined : (sharePointDispatcher ?? undefined),
        // @ts-ignore optional legacy agent
        agent: sharePointHttpsAgent
      });
    };

    let spResp: Response;
    try {
      spResp = await doFetch();
    } catch (primaryErr: any) {
      const msg = String(primaryErr?.message || '').toLowerCase();
      const isInvalidArg = msg.includes('invalid argument');
      if (isInvalidArg) {
        // Retry with Atom Accept which worked manually for user
        // eslint-disable-next-line no-console
        console.warn('[sharepoint proxy] primary fetch threw Invalid argument; retrying with application/atom+xml');
        spResp = await doFetch('application/atom+xml,application/json;q=0.9,*/*;q=0.8');
      } else {
        throw primaryErr;
      }
    }

    const raw = await spResp.text();
    const ct = spResp.headers.get('content-type') || '';
    let payload: any = raw;
    if (ct.includes('application/json')) {
      try { payload = JSON.parse(raw); } catch { /* swallow */ }
    } else if (/application\/atom\+xml|text\/xml/i.test(ct)) {
      // Very lightweight Atom -> JSON normalization (ids + title)
      try {
        const ids: any[] = [];
        const matches = raw.match(/<m:properties>[\s\S]*?<\/m:properties>/g) || [];
        for (const block of matches) {
          const idMatch = block.match(/<d:Id[^>]*>(\d+)<\/d:Id>/i) || block.match(/<d:ID[^>]*>(\d+)<\/d:ID>/i);
          const titleMatch = block.match(/<d:Title>([\s\S]*?)<\/d:Title>/i);
            ids.push({ Id: idMatch ? idMatch[1] : undefined, Title: titleMatch ? titleMatch[1] : '' });
        }
        payload = { d: { results: ids } };
      } catch { /* ignore */ }
    }
    res.status(spResp.status).json(payload);
  } catch (err: any) {
    // Enhanced logging for TLS issues
    const cause: any = err?.cause || {};
  const errorPayload = {
      error: err.message || 'Proxy error',
      code: (err as any).code,
      causeMessage: cause.message,
      causeCode: cause.code,
  targetUrl: site.replace(/\/$/, '') + fullPath
    };
  // eslint-disable-next-line no-console
  console.error('[sharepoint proxy] error stack:', err?.stack);
    // eslint-disable-next-line no-console
    console.error('[sharepoint proxy] network/fetch error', errorPayload);
    res.status(500).json(errorPayload);
  }
}