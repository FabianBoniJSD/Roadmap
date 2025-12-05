/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-require-imports */
import type { NextApiRequest, NextApiResponse } from 'next';
import got, { type Method as GotMethod, type Response as GotResponse } from 'got';
import { resolveSharePointSiteUrl } from '@/utils/sharepointEnv';
import { getSharePointAuthHeaders, SharePointAuthContext } from '@/utils/spAuth';
import { getInstanceConfigFromRequest, INSTANCE_QUERY_PARAM } from '@/utils/instanceConfig';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';
import { sharePointHttpsAgent, sharePointDispatcher } from '@/utils/httpsAgent';
// Fallback constructors for insecure TLS retry when allowed
// @ts-ignore builtin without node types in some build envs
const https = require('https');
// @ts-ignore import undici Agent dynamically to avoid hard dep in some analyzers
const { Agent: UndiciAgent } = require('undici');
// @ts-ignore child_process without node types in some build envs
const { execFile } = require('child_process');

function runCurl(
  args: string[],
  options: { timeout?: number; input?: Buffer | string; maxBuffer?: number } = {}
): Promise<{ stdout: string; stderr: string }> {
  const { timeout = 20000, input, maxBuffer = 50 * 1024 * 1024 } = options;
  return new Promise((resolve, reject) => {
    const child = execFile(
      'curl',
      args,
      { timeout, maxBuffer },
      (err: any, stdout: string, stderr: string) => {
        if (err) return reject(Object.assign(err, { stderr }));
        resolve({ stdout, stderr });
      }
    );
    if (input !== undefined && input !== null && child && child.stdin) {
      child.stdin.on('error', () => {
        /* ignore broken pipe */
      });
      child.stdin.end(input);
    }
  });
}

// Simple in-memory cache for curl mode GET responses
interface CurlCacheEntry {
  expires: number;
  payload: any;
}
const curlCache: Record<string, CurlCacheEntry> = {};
const invalidateCurlCache = () => {
  for (const k of Object.keys(curlCache)) delete curlCache[k];
};

const applyNoCacheHeaders = (res: NextApiResponse) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  const maybeRemovable = res as NextApiResponse & { removeHeader?: (name: string) => void };
  if (typeof maybeRemovable.removeHeader === 'function') {
    maybeRemovable.removeHeader('etag');
  }
};

// Whitelisted lists for safety
const ALLOWED_LISTS = new Set([
  'RoadmapProjects',
  'Roadmap Projects',
  'RoadmapCategories',
  'Roadmap Categories',
  'RoadmapSettings',
  'Roadmap Settings',
  'RoadmapFieldTypes',
  'Roadmap Field Types',
  'RoadmapFields',
  'Roadmap Fields',
  'RoadmapTeamMembers',
  'Roadmap Team Members',
  'RoadmapUsers',
  'Roadmap Users',
  'RoadmapProjectLinks',
  'Roadmap Project Links',
]);

// Allow /_api/contextinfo for digest retrieval
function isAllowedPath(path: string) {
  // Normalize trailing slashes (except root) so /_api/contextinfo/ is treated like /_api/contextinfo
  const cleaned = path.endsWith('/') ? path.replace(/\/+$/, '') : path;
  if (cleaned === '/_api/contextinfo') return true;
  // Allow current user lookup for authentication checks
  if (cleaned === '/_api/web/currentuser') return true;
  // Allow current user's SharePoint groups (needed for Owners membership checks)
  if (cleaned === '/_api/web/currentuser/Groups') return true;
  // Allow querying the site's associated owners group (Id/Title)
  if (cleaned === '/_api/web/AssociatedOwnerGroup') return true;
  // Allow People Picker API used by admin search
  if (
    /^\/_api\/SP\.UI\.ApplicationPages\.ClientPeoplePickerWebServiceInterface\.clientPeoplePickerSearchUser$/i.test(
      cleaned
    )
  )
    return true;
  // Allow SharePoint User Profiles properties lookup
  if (/^\/_api\/SP\.UserProfiles\.PeopleManager\/GetPropertiesFor\(/i.test(cleaned)) return true;
  // Allow userphoto handler for profile images
  if (/^\/_layouts\/15\/userphoto\.aspx/i.test(cleaned)) return true;
  // Allow People Picker API used by admin user search
  if (
    /^\/_api\/SP\.UI\.ApplicationPages\.ClientPeoplePickerWebServiceInterface\.clientPeoplePickerSearchUser$/i.test(
      cleaned
    )
  )
    return true;
  // Optional debug allowance to enumerate lists (avoids needing a specific list) ONLY when SP_PROXY_DEBUG enabled
  // @ts-ignore
  if (process.env.SP_PROXY_DEBUG === 'true' && cleaned === '/_api/web/lists') return true;
  if (!cleaned.startsWith('/_api/web/lists')) return false;
  const match = cleaned.match(/getByTitle\('([^']+)'\)/);
  if (!match) return false;
  return ALLOWED_LISTS.has(match[1]);
}

// Basic in-process digest cache (optional, improves performance for writes)
interface DigestCacheEntry {
  value: string;
  expires: number;
}
let digestCache: DigestCacheEntry | null = null;

async function getDigest(site: string, auth: SharePointAuthContext): Promise<string> {
  const now = Date.now();
  if (digestCache && digestCache.expires > now) return digestCache.value;
  const url = site.replace(/\/$/, '') + '/_api/contextinfo';
  const headers: Record<string, string> = {
    Accept: 'application/json;odata=nometadata',
    'Content-Length': '0',
    ...auth.headers,
  };
  const useGot = Boolean(auth.agent);
  const authHeaderValue = String(headers.Authorization || headers.authorization || '');
  const makeFetchOpts = (insecure = false) => ({
    method: 'POST',
    headers,
    // @ts-ignore undici fetch supports dispatcher
    dispatcher: insecure
      ? new UndiciAgent({ connect: { rejectUnauthorized: false } })
      : (sharePointDispatcher ?? undefined),
    // @ts-ignore optional legacy agent
    agent: insecure ? new https.Agent({ rejectUnauthorized: false }) : sharePointHttpsAgent,
  });
  if (useGot && !authHeaderValue.toLowerCase().startsWith('bearer ')) {
    const gotResp = await got(url, {
      method: 'POST',
      headers,
      body: '',
      throwHttpErrors: false,
      agent: auth.agent ? { https: auth.agent, http: auth.agent } : undefined,
    });
    if (gotResp.statusCode !== 200) throw new Error('Failed to get contextinfo');
    const parsed = JSON.parse(gotResp.body as string);
    digestCache = {
      value: parsed.FormDigestValue,
      expires: now + parsed.FormDigestTimeoutSeconds * 1000 - 60000,
    };
    return digestCache.value;
  }
  let r: Response;
  try {
    r = await fetch(url, makeFetchOpts(false) as any);
  } catch (e: any) {
    const allowInsecure =
      process.env.SP_ALLOW_SELF_SIGNED === 'true' ||
      process.env.SP_TLS_FALLBACK_INSECURE === 'true';
    const msg = String(e?.cause?.message || e?.message || '').toLowerCase();
    if (
      allowInsecure &&
      (e?.cause?.code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
        /self-signed|certificate in certificate chain/.test(msg))
    ) {
      // eslint-disable-next-line no-console
      console.warn('[sharepoint proxy] contextinfo TLS error; retrying insecure due to env flag');
      r = await fetch(url, makeFetchOpts(true) as any);
    } else {
      throw e;
    }
  }
  if (!r.ok) throw new Error('Failed to get contextinfo');
  const j = await r.json();
  digestCache = {
    value: j.FormDigestValue,
    expires: now + j.FormDigestTimeoutSeconds * 1000 - 60000,
  };
  return digestCache.value;
}

const bufferToArrayBuffer = (buf: Buffer): ArrayBuffer => {
  const copy = new Uint8Array(buf.length);
  copy.set(buf);
  return copy.buffer;
};

async function readRawBodyBuffer(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req as any as AsyncIterable<unknown>) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk));
    } else if (chunk instanceof Uint8Array) {
      chunks.push(Buffer.from(chunk));
    } else if (chunk) {
      chunks.push(Buffer.from(chunk as ArrayBufferLike));
    }
  }
  return Buffer.concat(chunks as unknown as readonly Uint8Array[]);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let instance: RoadmapInstanceConfig | null = null;
  try {
    instance = await getInstanceConfigFromRequest(req);
  } catch (error) {
    console.error('[sharepoint proxy] failed to resolve roadmap instance', error);
    return res.status(500).json({ error: 'Failed to resolve roadmap instance' });
  }
  if (!instance) {
    return res.status(404).json({ error: 'No roadmap instance configured for this request' });
  }

  res.setHeader('X-Roadmap-Instance', instance.slug);

  const site = resolveSharePointSiteUrl(instance);
  const segments = (req.query.sp as string[] | undefined) || [];
  const apiPath = '/' + segments.join('/');
  const qIndex = req.url?.indexOf('?') ?? -1;
  // Preserve raw encoded query string; earlier decoding attempts may trigger 'Invalid argument' before request
  let query = '';
  if (qIndex >= 0 && req.url) {
    const rawQuery = req.url.substring(qIndex + 1);
    const filtered = rawQuery.split('&').filter((segment) => {
      if (!segment) return false;
      const key = segment.split('=')[0];
      return key !== INSTANCE_QUERY_PARAM;
    });
    query = filtered.length ? `?${filtered.join('&')}` : '';
  }
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

  applyNoCacheHeaders(res);

  try {
    // Optional curl path: supports NTLM (with user/pass) and Kerberos (with system creds via kinit)
    const strategy = instance.sharePoint.strategy || process.env.SP_STRATEGY || '';
    if (process.env.SP_USE_CURL === 'true') {
      const username = instance.sharePoint.username || process.env.SP_USERNAME || '';
      const password = instance.sharePoint.password || process.env.SP_PASSWORD || '';
      const isKerb = strategy === 'kerberos';
      const allowNtlmFallback = process.env.SP_FALLBACK_NTLM === 'true' && !!username && !!password;
      const domain =
        instance.sharePoint.domain || (username.includes('\\') ? username.split('\\')[0] : '');
      const userPart = username.includes('\\') ? username.split('\\')[1] : username;
      const cred = domain ? `${domain}\\${userPart}:${password}` : `${userPart}:${password}`;
      const targetUrl = site.replace(/\/$/, '') + fullPath;
      const clientAccept =
        typeof req.headers['accept'] === 'string'
          ? req.headers['accept']
          : 'application/json;odata=nometadata';
      const cacheSeconds = parseInt(process.env.SP_CURL_CACHE_SECONDS || '60', 10);
      const caPath = instance.sharePoint.trustedCaPath || process.env.SP_TRUSTED_CA_PATH || '';
      const cacheKey = 'GET:' + targetUrl + '|' + clientAccept;
      if (req.method === 'GET' && cacheSeconds > 0) {
        const ent = curlCache[cacheKey];
        if (ent && ent.expires > Date.now()) {
          return res.status(200).json({ ...ent.payload, mode: 'curl', cached: true });
        }
      }
      // Handle non-GET. Treat HEAD as safe (no digest) and not a write.
      if (req.method !== 'GET') {
        const isContextInfo = /_api\/contextinfo/i.test(fullPath);
        const method = req.method.toUpperCase();
        if (method === 'HEAD') {
          const headArgs: string[] = [
            '-sS',
            '--ntlm',
            '--user',
            cred,
            '--noproxy',
            '*',
            '-I',
            '-H',
            `Accept: ${clientAccept}`,
            targetUrl,
          ];
          if (process.env.SP_ALLOW_SELF_SIGNED === 'true') headArgs.unshift('-k');
          else if (caPath) headArgs.unshift('--cacert', caPath);
          if (process.env.SP_CURL_VERBOSE === 'true') headArgs.unshift('-v');
          try {
            await new Promise((resolveExec, rejectExec) => {
              execFile(
                'curl',
                headArgs,
                { timeout: 15000 },
                (err: any, stdout: string, stderr: string) => {
                  if (err) return rejectExec(Object.assign(err, { stderr }));
                  resolveExec({ stdout, stderr });
                }
              );
            });
            res.setHeader('x-sp-proxy-mode', 'curl');
            if (process.env.SP_CURL_VERBOSE === 'true') res.setHeader('x-sp-proxy-ntlm', '1');
            return res.status(200).json({ ok: true });
          } catch (e: any) {
            if (isKerb && allowNtlmFallback) {
              try {
                const ntlmHeadArgs: string[] = [
                  '-sS',
                  '--ntlm',
                  '--user',
                  cred,
                  '--noproxy',
                  '*',
                  '-I',
                  '-H',
                  `Accept: ${clientAccept}`,
                  targetUrl,
                ];
                if (process.env.SP_ALLOW_SELF_SIGNED === 'true') ntlmHeadArgs.unshift('-k');
                else if (caPath) ntlmHeadArgs.unshift('--cacert', caPath);
                if (process.env.SP_CURL_VERBOSE === 'true') ntlmHeadArgs.unshift('-v');
                await new Promise((resolveExec, rejectExec) => {
                  execFile('curl', ntlmHeadArgs, { timeout: 15000 }, (err: any) => {
                    if (err) return rejectExec(err);
                    resolveExec(null);
                  });
                });
                res.setHeader('x-sp-proxy-mode', 'curl');
                res.setHeader('x-sp-proxy-fallback', 'ntlm');
                return res.status(200).json({ ok: true });
              } catch (ee: any) {
                return res.status(500).json({
                  error: 'curl-head-failed',
                  detail: ee.message,
                  stderr: ee.stderr,
                  fallbackTried: 'ntlm',
                });
              }
            }
            return res
              .status(500)
              .json({ error: 'curl-head-failed', detail: e.message, stderr: e.stderr });
          }
        }
        // Prepare common args
        const curlArgs: string[] = isKerb
          ? [
              '-sS',
              '--negotiate',
              '--user',
              cred,
              '--noproxy',
              '*',
              '-X',
              method,
              '-H',
              `Accept: ${clientAccept}`,
            ]
          : [
              '-sS',
              '--ntlm',
              '--user',
              cred,
              '--noproxy',
              '*',
              '-X',
              method,
              '-H',
              `Accept: ${clientAccept}`,
            ];
        if (process.env.SP_ALLOW_SELF_SIGNED === 'true') curlArgs.unshift('-k');
        if (process.env.SP_CURL_VERBOSE === 'true') curlArgs.unshift('-v');

        // If not contextinfo, fetch a FormDigest via curl first
        let formDigest: string | null = null;
        if (!isContextInfo) {
          const ciArgs = isKerb
            ? ['-sS', '--negotiate', '--user', cred, '--noproxy', '*', '-X', 'POST']
            : ['-sS', '--ntlm', '--user', cred, '--noproxy', '*', '-X', 'POST'];
          if (process.env.SP_ALLOW_SELF_SIGNED === 'true') ciArgs.unshift('-k');
          else if (caPath) ciArgs.unshift('--cacert', caPath);
          if (process.env.SP_CURL_VERBOSE === 'true') ciArgs.unshift('-v');
          ciArgs.push('-H', 'Accept: application/json;odata=nometadata');
          ciArgs.push(targetUrl.replace(fullPath, '') + '/_api/contextinfo');
          // contextinfo accepts empty body
          ciArgs.push('-H', 'Content-Length: 0');
          try {
            const ciOut: { stdout: string; stderr: string } = await new Promise(
              (resolveExec, rejectExec) => {
                execFile(
                  'curl',
                  ciArgs,
                  { timeout: 15000 },
                  (err: any, stdout: string, stderr: string) => {
                    if (err) return rejectExec(Object.assign(err, { stderr }));
                    resolveExec({ stdout, stderr });
                  }
                );
              }
            );
            try {
              const j = JSON.parse(ciOut.stdout);
              formDigest = j.FormDigestValue || null;
            } catch {
              formDigest = null;
            }
          } catch {
            if (isKerb && allowNtlmFallback) {
              try {
                const ciNArgs = ['-sS', '--ntlm', '--user', cred, '--noproxy', '*', '-X', 'POST'];
                if (process.env.SP_ALLOW_SELF_SIGNED === 'true') ciNArgs.unshift('-k');
                else if (caPath) ciNArgs.unshift('--cacert', caPath);
                if (process.env.SP_CURL_VERBOSE === 'true') ciNArgs.unshift('-v');
                ciNArgs.push('-H', 'Accept: application/json;odata=nometadata');
                ciNArgs.push(targetUrl.replace(fullPath, '') + '/_api/contextinfo');
                ciNArgs.push('-H', 'Content-Length: 0');
                const ciNOut: { stdout: string } = await new Promise((resolveExec, rejectExec) => {
                  execFile('curl', ciNArgs, { timeout: 15000 }, (err: any, stdout: string) => {
                    if (err) return rejectExec(err);
                    resolveExec({ stdout });
                  });
                });
                try {
                  const j = JSON.parse(ciNOut.stdout);
                  formDigest = j.FormDigestValue || null;
                } catch {
                  formDigest = null;
                }
              } catch {
                // ignore; will attempt without digest (likely fails)
              }
            }
          }
        }

        // Honor client method overrides and headers
        const hdrs: string[] = [];
        const reqContentType =
          typeof req.headers['content-type'] === 'string'
            ? req.headers['content-type']
            : 'application/json;odata=verbose';
        hdrs.push('-H', `Content-Type: ${reqContentType}`);
        if (formDigest) hdrs.push('-H', `X-RequestDigest: ${formDigest}`);
        const xHttpMethod = (req.headers['x-http-method'] ||
          req.headers['x-http-method-override']) as string | undefined;
        if (xHttpMethod) hdrs.push('-H', `X-HTTP-Method: ${xHttpMethod}`);
        const ifMatch = req.headers['if-match'] as string | undefined;
        if (ifMatch) hdrs.push('-H', `IF-MATCH: ${ifMatch}`);

        // Body handling (support binary uploads)
        let bodyBuffer: Buffer | null = null;
        let bodyString: string | null = null;
        if (req.body !== undefined && req.body !== null) {
          if (Buffer.isBuffer(req.body)) {
            bodyBuffer = req.body as Buffer;
          } else if (typeof req.body === 'string') {
            if (/application\/octet-stream/i.test(reqContentType)) {
              bodyBuffer = Buffer.from(req.body, 'binary');
            } else {
              bodyString = req.body;
            }
          } else if (req.body instanceof ArrayBuffer) {
            bodyBuffer = Buffer.from(req.body);
          } else if (
            typeof req.body === 'object' &&
            (req.body as { type?: string; data?: number[] }).type === 'Buffer' &&
            Array.isArray((req.body as { data?: number[] }).data)
          ) {
            bodyBuffer = Buffer.from((req.body as { data: number[] }).data);
          } else {
            try {
              bodyString = JSON.stringify(req.body);
            } catch {
              bodyString = String(req.body);
            }
          }
        }

        const shouldSendBody =
          method === 'POST' || method === 'PATCH' || method === 'MERGE' || method === 'DELETE';
        const dataArgs: string[] = [];
        if (shouldSendBody) {
          if (bodyBuffer) {
            dataArgs.push('--data-binary', '@-');
          } else {
            dataArgs.push('--data', bodyString ?? '');
          }
        }

        if (process.env.SP_ALLOW_SELF_SIGNED === 'true') curlArgs.unshift('-k');
        else if (caPath) curlArgs.unshift('--cacert', caPath);
        const writeArgs = [...curlArgs, ...hdrs, ...dataArgs, targetUrl];
        try {
          const output = await runCurl(writeArgs, {
            timeout: 20000,
            input: bodyBuffer ?? undefined,
          });
          let parsed: any = output.stdout;
          try {
            parsed = JSON.parse(output.stdout);
          } catch {
            /* ignore */
          }
          res.setHeader('x-sp-proxy-mode', 'curl');
          if (process.env.SP_CURL_VERBOSE === 'true') res.setHeader('x-sp-proxy-ntlm', '1');
          invalidateCurlCache();
          return res.status(200).json(parsed);
        } catch (e: any) {
          if (isKerb && allowNtlmFallback) {
            try {
              const ntlmCurlArgs: string[] = [
                '-sS',
                '--ntlm',
                '--user',
                cred,
                '--noproxy',
                '*',
                '-X',
                method,
                '-H',
                `Accept: ${clientAccept}`,
              ];
              if (process.env.SP_ALLOW_SELF_SIGNED === 'true') ntlmCurlArgs.unshift('-k');
              else if (caPath) ntlmCurlArgs.unshift('--cacert', caPath);
              if (process.env.SP_CURL_VERBOSE === 'true') ntlmCurlArgs.unshift('-v');
              const ntlmWriteArgs = [...ntlmCurlArgs, ...hdrs, ...dataArgs, targetUrl];
              const out2 = await runCurl(ntlmWriteArgs, {
                timeout: 20000,
                input: bodyBuffer ?? undefined,
              });
              let parsed2: any = out2.stdout;
              try {
                parsed2 = JSON.parse(out2.stdout);
              } catch {}
              res.setHeader('x-sp-proxy-mode', 'curl');
              res.setHeader('x-sp-proxy-fallback', 'ntlm');
              invalidateCurlCache();
              return res.status(200).json(parsed2);
            } catch (ee: any) {
              return res.status(500).json({
                error: 'curl-post-failed',
                detail: ee.message,
                stderr: ee.stderr,
                fallbackTried: 'ntlm',
              });
            }
          }
          return res
            .status(500)
            .json({ error: 'curl-post-failed', detail: e.message, stderr: e.stderr });
        }
      }
      // Sanitize allowed path already checked earlier; still ensure no shell injection (use execFile arg array)
      const curlArgs = isKerb
        ? [
            '-sS',
            '--negotiate',
            '--user',
            cred,
            '--noproxy',
            '*',
            '--connect-timeout',
            '5',
            '--retry',
            '1',
            '-H',
            `Accept: ${clientAccept}`,
            targetUrl,
          ]
        : [
            '-sS',
            '--ntlm',
            '--user',
            cred,
            '--noproxy',
            '*',
            '--connect-timeout',
            '5',
            '--retry',
            '1',
            '-H',
            `Accept: ${clientAccept}`,
            targetUrl,
          ];
      if (process.env.SP_ALLOW_SELF_SIGNED === 'true') curlArgs.unshift('-k');
      else if (caPath) curlArgs.unshift('--cacert', caPath);
      if (process.env.SP_ALLOW_SELF_SIGNED === 'true') curlArgs.unshift('-k');
      if (process.env.SP_CURL_VERBOSE === 'true') curlArgs.unshift('-v');
      const start = Date.now();
      const output: { stdout: string; stderr: string } = await new Promise(
        (resolveExec, rejectExec) => {
          execFile(
            'curl',
            curlArgs,
            { timeout: 15000 },
            (err: any, stdout: string, stderr: string) => {
              if (err) return rejectExec(Object.assign(err, { stderr }));
              resolveExec({ stdout, stderr });
            }
          );
        }
      );
      const duration = Date.now() - start;
      let rawOut = output.stdout;
      let normalized: any = null;
      const looksUnauthorized =
        /401\s*UNAUTHORIZED/i.test(String(rawOut)) ||
        (/^\s*<html/i.test(String(rawOut)) && /401/i.test(String(rawOut)));
      if (isKerb && allowNtlmFallback && looksUnauthorized) {
        try {
          const ntlmArgs = [
            '-sS',
            '--ntlm',
            '--user',
            cred,
            '--noproxy',
            '*',
            '--connect-timeout',
            '5',
            '--retry',
            '1',
            '-H',
            `Accept: ${clientAccept}`,
            targetUrl,
          ];
          if (process.env.SP_ALLOW_SELF_SIGNED === 'true') ntlmArgs.unshift('-k');
          else if (caPath) ntlmArgs.unshift('--cacert', caPath);
          if (process.env.SP_CURL_VERBOSE === 'true') ntlmArgs.unshift('-v');
          const out2: { stdout: string; stderr: string } = await new Promise(
            (resolveExec, rejectExec) => {
              execFile(
                'curl',
                ntlmArgs,
                { timeout: 15000 },
                (err: any, stdout: string, stderr: string) => {
                  if (err) return rejectExec(Object.assign(err, { stderr }));
                  resolveExec({ stdout, stderr });
                }
              );
            }
          );
          rawOut = out2.stdout;
          res.setHeader('x-sp-proxy-fallback', 'ntlm');
        } catch {
          // keep original rawOut
        }
      }
      // Attempt JSON parse first if looks like JSON
      if (/^\s*\{/.test(rawOut)) {
        try {
          normalized = JSON.parse(rawOut);
        } catch {
          /* ignore */
        }
      }
      if (!normalized) {
        // Atom/XML -> lightweight normalization (Ids + Title + selected fields if present)
        if (/^\s*<\?xml/.test(rawOut) && /<feed/i.test(rawOut)) {
          try {
            const entries = rawOut.match(/<m:properties>[\s\S]*?<\/m:properties>/g) || [];
            const items: Record<string, any>[] = [];
            for (const block of entries) {
              const idMatch =
                block.match(/<d:Id[^>]*>(\d+)<\/d:Id>/i) ||
                block.match(/<d:ID[^>]*>(\d+)<\/d:ID>/i);
              const titleMatch = block.match(/<d:Title>([\s\S]*?)<\/d:Title>/i);
              const item: any = {
                Id: idMatch ? parseInt(idMatch[1], 10) : undefined,
                Title: titleMatch ? titleMatch[1] : '',
              };
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
          } catch {
            /* ignore */
          }
        }
      }
      if (!normalized) normalized = rawOut; // fallback raw
      if (typeof normalized === 'string' && /<html/i.test(normalized) && /401/i.test(normalized)) {
        return res.status(401).json({
          error: 'Unauthorized (curl)',
          snippet: normalized.substring(0, 160),
          stderr: process.env.SP_CURL_VERBOSE === 'true' ? output.stderr : undefined,
        });
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
      res.setHeader('x-sp-proxy-mode', 'curl');
      res.setHeader('x-sp-proxy-ms', String(duration));
      if (process.env.SP_CURL_VERBOSE === 'true') res.setHeader('x-sp-proxy-ntlm', '1');
      if (req.method === 'GET' && cacheSeconds > 0) {
        curlCache[cacheKey] = { expires: Date.now() + cacheSeconds * 1000, payload: bodyToSend };
      }
      return res.status(200).json(bodyToSend);
    }

    const authContext = await getSharePointAuthHeaders(instance);
    const authHeaders = authContext.headers;
    const ntlmAgent = authContext.agent;
    if ((process.env.SP_STRATEGY || '') === 'kerberos') {
      res.setHeader('x-sp-auth-mode', 'kerberos');
    }
    const targetUrl = site.replace(/\/$/, '') + fullPath;

    const method = req.method || 'GET';
    const isWrite = ['POST', 'PATCH', 'MERGE', 'PUT', 'DELETE'].includes(method);
    let rawBodyBuffer: Buffer | null = null;
    if (isWrite && typeof req.body === 'undefined') {
      rawBodyBuffer = await readRawBodyBuffer(req);
    }
    const prepareRequestBody = (rawBuffer?: Buffer | null): BodyInit | undefined => {
      if (!isWrite) return undefined;
      if (rawBuffer && rawBuffer.length) return bufferToArrayBuffer(rawBuffer);
      const incoming = req.body as unknown;
      if (incoming == null) return undefined;
      if (typeof incoming === 'string') return incoming;
      if (Buffer.isBuffer(incoming)) return bufferToArrayBuffer(incoming);
      if (incoming instanceof Uint8Array) return incoming as unknown as BodyInit;
      if (incoming instanceof ArrayBuffer) return incoming as unknown as BodyInit;
      if (
        typeof incoming === 'object' &&
        (incoming as { type?: string; data?: number[] }).type === 'Buffer' &&
        Array.isArray((incoming as { data?: number[] }).data)
      ) {
        return bufferToArrayBuffer(Buffer.from((incoming as { data: number[] }).data));
      }
      try {
        return JSON.stringify(incoming);
      } catch (err) {
        console.warn(
          '[sharepoint proxy] failed to stringify request body, sending empty payload',
          err
        );
        return undefined;
      }
    };
    const preparedBody = prepareRequestBody(rawBodyBuffer);
    // Forward client's Accept when possible to preserve expected payload shape (nometadata vs verbose)
    const clientAccept = req.headers['accept'];
    const wantsBinary = apiPath.startsWith('/_layouts/15/userphoto.aspx');
    const headers: Record<string, string> = {
      Accept: wantsBinary
        ? '*/*'
        : typeof clientAccept === 'string'
          ? clientAccept
          : 'application/json;odata=nometadata',
      // Prefer incoming Content-Type for compatibility with OData verbose when bodies include __metadata
      'Content-Type':
        typeof req.headers['content-type'] === 'string'
          ? String(req.headers['content-type'])
          : 'application/json;odata=verbose',
      ...authHeaders,
    };

    if (isWrite && apiPath !== '/_api/contextinfo') {
      try {
        headers['X-RequestDigest'] = await getDigest(site, authContext);
      } catch (e) {
        console.warn('Digest retrieval failed', e);
      }
      // Support MERGE (update) if client sets X-HTTP-Method header externally (we could map here if needed)
      if (method === 'PATCH') {
        headers['IF-MATCH'] = '*';
        headers['X-HTTP-Method'] = 'MERGE';
      }
      // Forward client-provided X-HTTP-Method/IF-MATCH for POST-based overrides (MERGE/DELETE)
      const xhm = req.headers['x-http-method'] as string | undefined;
      if (xhm) headers['X-HTTP-Method'] = xhm;
      const ifm = req.headers['if-match'] as string | undefined;
      if (ifm) headers['IF-MATCH'] = ifm;
    }

    const effectiveMethod = method === 'PATCH' ? 'POST' : method;
    const shouldSendBody =
      Boolean(preparedBody) && effectiveMethod !== 'GET' && effectiveMethod !== 'HEAD';
    const normalizeBodyForGot = (body: BodyInit | undefined): Buffer | string | undefined => {
      if (body == null) return undefined;
      if (typeof body === 'string') return body;
      if (Buffer.isBuffer(body)) return body;
      if (body instanceof ArrayBuffer) return Buffer.from(body);
      if (ArrayBuffer.isView(body))
        return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
      return undefined;
    };
    const gotBodyPayload = normalizeBodyForGot(preparedBody);
    const logOutgoingHeaders = (h: Record<string, string>) => {
      if (process.env.SP_PROXY_DEBUG !== 'true') return;
      const redacted: Record<string, string> = {};
      Object.entries(h).forEach(([key, value]) => {
        if (key.toLowerCase() === 'authorization' && typeof value === 'string') {
          redacted[key] = value.substring(0, 16) + '…';
        } else if (key.toLowerCase() === 'cookie' && typeof value === 'string') {
          redacted[key] = value
            .split(';')
            .map((part) => {
              const [name] = part.split('=');
              return `${name}=***`;
            })
            .join(';');
        } else {
          redacted[key] = value;
        }
      });
      // eslint-disable-next-line no-console
      console.debug('[sharepoint proxy] outgoing headers', redacted);
    };

    const sendSharePointRequest = async (
      acceptOverride?: string,
      insecure = false
    ): Promise<Response> => {
      const h = { ...headers };
      if (acceptOverride) h['Accept'] = acceptOverride;
      logOutgoingHeaders(h);
      if (ntlmAgent && !insecure) {
        const resp = (await got(targetUrl, {
          method: effectiveMethod as GotMethod,
          headers: h,
          body: shouldSendBody ? (gotBodyPayload ?? '') : undefined,
          throwHttpErrors: false,
          responseType: 'buffer',
          agent: { https: ntlmAgent, http: ntlmAgent },
        })) as GotResponse<Buffer>;
        const gotHeaders = new Headers();
        Object.entries(resp.headers).forEach(([key, value]) => {
          if (Array.isArray(value)) gotHeaders.set(key, value.join(', '));
          else if (typeof value === 'string') gotHeaders.set(key, value);
        });
        const bufferBody = resp.body as Buffer;
        const disallowBodyStatuses = new Set([204, 205, 304]);
        let responseBody: ArrayBuffer | null = null;
        if (!disallowBodyStatuses.has(resp.statusCode)) {
          responseBody = bufferBody.buffer.slice(
            bufferBody.byteOffset,
            bufferBody.byteOffset + bufferBody.byteLength
          ) as ArrayBuffer;
        }
        return new Response(responseBody, {
          status: resp.statusCode,
          statusText: resp.statusMessage || '',
          headers: gotHeaders,
        });
      }
      return fetch(targetUrl, {
        method: effectiveMethod,
        headers: h,
        body: preparedBody,
        // @ts-ignore undici dispatcher (may be root cause for 'Invalid argument' in some builds; keep but could disable via env)
        dispatcher:
          process.env.SP_DISABLE_DISPATCHER === 'true'
            ? undefined
            : insecure
              ? new UndiciAgent({ connect: { rejectUnauthorized: false } })
              : (sharePointDispatcher ?? undefined),
        // @ts-ignore optional legacy agent
        agent: insecure ? new https.Agent({ rejectUnauthorized: false }) : sharePointHttpsAgent,
      });
    };

    let spResp: Response;
    try {
      spResp = await sendSharePointRequest();
    } catch (primaryErr: any) {
      const msg = String(primaryErr?.message || '').toLowerCase();
      const isInvalidArg = msg.includes('invalid argument');
      const isSelfSigned =
        primaryErr?.cause?.code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
        /self-signed|certificate in certificate chain/.test(
          String(primaryErr?.cause?.message || primaryErr?.message || '').toLowerCase()
        );
      if (isInvalidArg) {
        // Retry with Atom Accept which worked manually for user
        // eslint-disable-next-line no-console
        console.warn(
          '[sharepoint proxy] primary fetch threw Invalid argument; retrying with application/atom+xml'
        );
        spResp = await sendSharePointRequest(
          'application/atom+xml,application/json;q=0.9,*/*;q=0.8'
        );
      } else if (
        isSelfSigned &&
        (process.env.SP_ALLOW_SELF_SIGNED === 'true' ||
          process.env.SP_TLS_FALLBACK_INSECURE === 'true')
      ) {
        // eslint-disable-next-line no-console
        console.warn(
          '[sharepoint proxy] TLS self-signed error; retrying with insecure TLS due to env flag'
        );
        spResp = await sendSharePointRequest(undefined, true);
      } else {
        throw primaryErr;
      }
    }

    const ct = spResp.headers.get('content-type') || '';
    const buffer = Buffer.from(await spResp.arrayBuffer());
    if (spResp.status === 401 || spResp.status === 403) {
      try {
        const snippet = buffer.toString('utf8', 0, Math.min(buffer.length, 500));
        // eslint-disable-next-line no-console
        console.error('[sharepoint proxy] auth failure from SharePoint', {
          status: spResp.status,
          instance: instance.slug,
          targetUrl,
          snippet,
        });
      } catch {
        // ignore logging errors
      }
    }
    const isJson = /application\/json|text\/json/i.test(ct);
    const isXml = /application\/atom\+xml|text\/xml|application\/xml/i.test(ct);
    const isText = /^text\//i.test(ct) && !isXml && !isJson;

    if (!isJson && !isXml && !isText) {
      const disposition = spResp.headers.get('content-disposition');
      const length = spResp.headers.get('content-length');
      if (ct) res.setHeader('Content-Type', ct);
      if (disposition) res.setHeader('Content-Disposition', disposition);
      if (length) res.setHeader('Content-Length', length);
      return res.status(spResp.status).send(buffer);
    }

    const raw = buffer.toString('utf8');
    if (isText && !isJson && !isXml) {
      if (ct) res.setHeader('Content-Type', ct);
      return res.status(spResp.status).send(raw);
    }

    let payload: any = raw;
    if (isJson) {
      try {
        payload = JSON.parse(raw);
      } catch {
        /* swallow */
      }
    } else if (isXml) {
      try {
        const ids: any[] = [];
        const matches = raw.match(/<m:properties>[\s\S]*?<\/m:properties>/g) || [];
        for (const block of matches) {
          const idMatch =
            block.match(/<d:Id[^>]*>(\d+)<\/d:Id>/i) || block.match(/<d:ID[^>]*>(\d+)<\/d:ID>/i);
          const titleMatch = block.match(/<d:Title>([\s\S]*?)<\/d:Title>/i);
          ids.push({
            Id: idMatch ? idMatch[1] : undefined,
            Title: titleMatch ? titleMatch[1] : '',
          });
        }
        payload = { d: { results: ids } };
      } catch {
        /* ignore */
      }
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
      targetUrl: site.replace(/\/$/, '') + fullPath,
    };
    // eslint-disable-next-line no-console
    console.error('[sharepoint proxy] error stack:', err?.stack);
    // eslint-disable-next-line no-console
    console.error('[sharepoint proxy] network/fetch error', errorPayload);
    res.status(500).json(errorPayload);
  }
}
