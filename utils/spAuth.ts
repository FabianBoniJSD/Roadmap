import https from 'https';
import { URL as NodeURL } from 'url';
import tls from 'tls';
import path from 'path';
import { Buffer } from 'buffer';
import crypto from 'crypto';
import { fbaLogin } from './fbaAuth';
import './md4Fallback';
import os from 'os';
import { resolveSharePointSiteUrl } from './sharepointEnv';
import { getPrimaryCredentials } from './userCredentials';
import fs from 'fs';
import type { IAuthOptions } from 'node-sp-auth/lib/src/auth/IAuthOptions';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

type NodeSpAuthResponse = {
  headers: Record<string, unknown>;
  options?: {
    [key: string]: unknown;
  };
};

type CredentialPermutation = Partial<IAuthOptions> & {
  fba?: boolean;
  rejectUnauthorized?: boolean;
};
type OnPremCredential = CredentialPermutation & {
  username: string;
  password: string;
  workstation?: string;
  domain?: string;
};

export interface SharePointAuthContext {
  headers: Record<string, string>;
  agent?: https.Agent;
}

const assertOnPremCredential = (cred?: CredentialPermutation): OnPremCredential => {
  if (!cred || typeof cred !== 'object') {
    throw new Error('NTLM diagnostics require at least one credential permutation.');
  }
  const username = (cred as { username?: unknown }).username;
  const password = (cred as { password?: unknown }).password;
  if (typeof username !== 'string' || typeof password !== 'string') {
    throw new Error('NTLM diagnostics require username/password credentials.');
  }
  return { ...cred, username, password } as OnPremCredential;
};

type ExtendedError = Error & { code?: string; stderr?: string };

type NtlmHelpers = {
  createType1Message?: (options: { domain?: string; workstation?: string }) => string;
  createType3Message?: (
    type2Message: string,
    options: { username: string; password: string; domain?: string; workstation?: string }
  ) => string;
  decodeType2Message?: (token: string) => { targetName?: string; negotiateFlags?: number };
};

const toExtendedError = (error: unknown): ExtendedError => {
  if (error instanceof Error) return error as ExtendedError;
  const normalized = typeof error === 'string' ? error : JSON.stringify(error);
  return new Error(normalized) as ExtendedError;
};

const getErrorMessage = (error: unknown): string => toExtendedError(error).message ?? '';
// Optional dynamic NTLM helpers (only loaded in diagnostic mode to avoid extra overhead otherwise)
let ntlmHelpersPromise: Promise<NtlmHelpers> | null = null;
let nodeSpAuthModule: Promise<{ getAuth: (typeof import('node-sp-auth'))['getAuth'] }> | null =
  null;

async function loadNodeSpAuth(needsProxy: boolean) {
  if (!nodeSpAuthModule) {
    const shouldScrubProxy = !needsProxy;
    const saves: Record<string, string | undefined> = shouldScrubProxy
      ? {
          HTTP_PROXY: process.env.HTTP_PROXY,
          HTTPS_PROXY: process.env.HTTPS_PROXY,
          http_proxy: process.env.http_proxy,
          https_proxy: process.env.https_proxy,
        }
      : {};

    if (shouldScrubProxy) {
      delete process.env.HTTP_PROXY;
      delete process.env.HTTPS_PROXY;
      delete process.env.http_proxy;
      delete process.env.https_proxy;
      debugLog('node-sp-auth bootstrap: proxy env vars removed before module load');
    }

    nodeSpAuthModule = (async () => {
      try {
        return await import('node-sp-auth');
      } finally {
        if (shouldScrubProxy) {
          if (saves.HTTP_PROXY !== undefined) process.env.HTTP_PROXY = saves.HTTP_PROXY;
          else delete process.env.HTTP_PROXY;
          if (saves.HTTPS_PROXY !== undefined) process.env.HTTPS_PROXY = saves.HTTPS_PROXY;
          else delete process.env.HTTPS_PROXY;
          if (saves.http_proxy !== undefined) process.env.http_proxy = saves.http_proxy;
          else delete process.env.http_proxy;
          if (saves.https_proxy !== undefined) process.env.https_proxy = saves.https_proxy;
          else delete process.env.https_proxy;
          debugLog('node-sp-auth bootstrap: proxy env vars restored after module load');
        }
      }
    })();
  }
  const mod = await nodeSpAuthModule;
  return mod.getAuth;
}

async function loadNtlmHelpers(): Promise<NtlmHelpers> {
  if (!ntlmHelpersPromise) {
    ntlmHelpersPromise = (async () => {
      try {
        const mod = await import('node-ntlm-client');
        const resolved = (mod as { default?: NtlmHelpers }).default ?? (mod as NtlmHelpers);
        return resolved;
      } catch {
        return {};
      }
    })();
  }
  return ntlmHelpersPromise;
}

interface CachedAuth extends SharePointAuthContext {
  expires: number;
}
const cachedAuthByKey = new Map<string, CachedAuth>();

const buildAuthCacheKey = (params: {
  siteUrl: string;
  strategy: string;
  username: string;
  password: string;
  domain?: string;
  workstation?: string;
  extraModes?: string[];
}): string => {
  const modes = (params.extraModes || []).map((m) => m.trim().toLowerCase()).filter(Boolean);
  // Do NOT store plaintext passwords; use a short fingerprint to avoid cache collisions
  // when multiple instances share the same username but have different passwords.
  const passFp = crypto.createHash('sha256').update(params.password).digest('hex').slice(0, 12);
  return [
    params.strategy.trim().toLowerCase(),
    params.siteUrl.trim().toLowerCase(),
    params.username.trim().toLowerCase(),
    `pw=${passFp}`,
    (params.domain || '').trim().toLowerCase(),
    (params.workstation || '').trim().toLowerCase(),
    modes.join('|'),
  ].join('::');
};

const getCachedAuth = (key: string, disableCache: boolean): CachedAuth | null => {
  if (disableCache) return null;
  const entry = cachedAuthByKey.get(key);
  if (!entry) return null;
  if (entry.expires > Date.now()) return entry;
  cachedAuthByKey.delete(key);
  return null;
};

const setCachedAuth = (key: string, entry: CachedAuth) => {
  cachedAuthByKey.set(key, entry);
  // Light pruning to avoid unbounded growth
  if (cachedAuthByKey.size > 100) {
    for (const [k, v] of cachedAuthByKey) {
      if (v.expires <= Date.now()) cachedAuthByKey.delete(k);
    }
  }
};

function debugLog(...args: unknown[]) {
  if (process.env.SP_PROXY_DEBUG === 'true') {
    // eslint-disable-next-line no-console
    console.debug('[spAuth]', ...args);
  }
}

type ProxyEnvKey = 'HTTP_PROXY' | 'HTTPS_PROXY' | 'http_proxy' | 'https_proxy';
type ProxyEnvSnapshot = Record<ProxyEnvKey, string | undefined>;

const proxyEnvKeys: ProxyEnvKey[] = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'];

const getExtraModes = (instance?: RoadmapInstanceConfig | null): string[] => {
  if (instance?.sharePoint.extraModes && instance.sharePoint.extraModes.length > 0) {
    return instance.sharePoint.extraModes;
  }
  return (process.env.SP_AUTH_EXTRA || '')
    .split(',')
    .map((mode) => mode.trim().toLowerCase())
    .filter(Boolean);
};

const getTrustedCaPath = (instance?: RoadmapInstanceConfig | null): string | undefined => {
  const candidate = instance?.sharePoint.trustedCaPath || process.env.SP_TRUSTED_CA_PATH;
  if (!candidate) return undefined;
  return candidate.trim() || undefined;
};

const captureProxyEnv = (): ProxyEnvSnapshot => ({
  HTTP_PROXY: process.env.HTTP_PROXY,
  HTTPS_PROXY: process.env.HTTPS_PROXY,
  http_proxy: process.env.http_proxy,
  https_proxy: process.env.https_proxy,
});

const applyProxyEnvSnapshot = (snapshot: ProxyEnvSnapshot) => {
  for (const key of proxyEnvKeys) {
    const value = snapshot[key];
    if (value !== undefined) process.env[key] = value;
    else delete process.env[key];
  }
};

const temporarilyDisableProxyEnv = (reason?: string): (() => void) => {
  const snapshot = captureProxyEnv();
  let modified = false;
  for (const key of proxyEnvKeys) {
    if (process.env[key]) {
      delete process.env[key];
      modified = true;
    }
  }
  if (modified && reason) {
    debugLog(reason);
  }
  return () => applyProxyEnvSnapshot(snapshot);
};

async function executeNodeSpAuthAttempt(
  siteUrl: string,
  creds: CredentialPermutation,
  disableProxyEnv: boolean,
  label: string
): Promise<SharePointAuthContext> {
  const restoreProxyEnv = disableProxyEnv
    ? temporarilyDisableProxyEnv(`node-sp-auth ${label}: disabled HTTP(S)_PROXY env vars`)
    : null;
  try {
    const getAuth = await loadNodeSpAuth(!disableProxyEnv);
    const auth = (await getAuth(siteUrl, creds as IAuthOptions)) as NodeSpAuthResponse;
    const agent = (auth.options?.agent as https.Agent | undefined) || undefined;
    return { headers: auth.headers as Record<string, string>, agent };
  } finally {
    restoreProxyEnv?.();
  }
}

export async function getSharePointAuthHeaders(
  instance?: RoadmapInstanceConfig | null
): Promise<SharePointAuthContext> {
  return getSharePointAuthHeadersInternal(instance || null);
}

async function getSharePointAuthHeadersInternal(
  instance: RoadmapInstanceConfig | null
): Promise<SharePointAuthContext> {
  const siteUrl = resolveSharePointSiteUrl(instance || undefined);
  const strategy = instance?.sharePoint.strategy || process.env.SP_STRATEGY || 'online';
  const extraModes = getExtraModes(instance);
  const forceSingle =
    (instance?.sharePoint.forceSingleCreds ?? false) ||
    process.env.SP_FORCE_SINGLE_CREDS === 'true';
  const allowSelfSigned =
    instance?.sharePoint.allowSelfSigned === true ||
    process.env.SP_ALLOW_SELF_SIGNED === 'true' ||
    process.env.SP_TLS_FALLBACK_INSECURE === 'true';
  const manualNtlmEnabled =
    instance?.sharePoint.manualNtlmFallback === true ||
    process.env.SP_MANUAL_NTLM_FALLBACK === 'true';
  const ntlmPersistentEnabled =
    instance?.sharePoint.ntlmPersistentSocket === true ||
    process.env.SP_NTLM_PERSISTENT_SOCKET === 'true';
  const ntlmSocketProbeEnabled =
    instance?.sharePoint.ntlmSocketProbe === true || process.env.SP_NTLM_SOCKET_PROBE === 'true';

  // Simple cache to avoid repeating expensive NTLM handshake for every request.
  const disableCache =
    instance?.sharePoint.authNoCache === true || process.env.SP_AUTH_NO_CACHE === 'true';

  // Get credentials from SP_USERNAME/SP_PASSWORD (preferred) or fallback to USER_* secrets
  const credentials = getPrimaryCredentials({
    username: instance?.sharePoint.username,
    password: instance?.sharePoint.password,
  });
  if (!credentials) {
    throw new Error(
      'No credentials found. Set SP_USERNAME/SP_PASSWORD (preferred) or USER_* secrets.'
    );
  }
  const usernameEnv = credentials.username;
  const passwordEnv = credentials.password;
  const domainEnv = instance?.sharePoint.domain || process.env.SP_ONPREM_DOMAIN || '';
  const workstationEnv =
    instance?.sharePoint.workstation || process.env.SP_ONPREM_WORKSTATION || undefined;

  const cacheKey = buildAuthCacheKey({
    siteUrl,
    strategy,
    username: usernameEnv,
    password: passwordEnv,
    domain: domainEnv,
    workstation: workstationEnv,
    extraModes,
  });
  const fromCache = getCachedAuth(cacheKey, disableCache);
  if (fromCache) return fromCache;

  // Build list of credential permutations (especially for NTLM) because farms differ in accepted forms
  const permutations: CredentialPermutation[] = [];
  const ws = workstationEnv || os.hostname().split('.')[0];

  if (strategy === 'basic') {
    // Basic Authentication: simple username:password base64 encoding
    const auth = Buffer.from(`${usernameEnv}:${passwordEnv}`).toString('base64');
    const headers: Record<string, string> = {
      Accept: 'application/json;odata=nometadata',
      Authorization: `Basic ${auth}`,
    };
    const cached = { headers, expires: Date.now() + 60 * 60 * 1000 };
    setCachedAuth(cacheKey, cached);
    debugLog('basic auth headers prepared');
    return cached;
  } else if (strategy === 'kerberos') {
    // Kerberos: rely on browser/OS negotiation; server-side calls typically run under a domain account or are avoided.
    // We purposefully do NOT inject Authorization header; SharePoint/IIS will issue 401 with WWW-Authenticate: Negotiate and browser will respond.
    // For server initiated calls (Node) you would need a separate Kerberos client lib; out-of-scope here.
    const headers: Record<string, string> = { Accept: 'application/json;odata=verbose' };
    const cached = { headers, expires: Date.now() + 5 * 60 * 1000 };
    setCachedAuth(cacheKey, cached);
    debugLog('kerberos mode headers prepared (no Authorization)');
    return cached;
  } else if (strategy === 'fba') {
    // FBA will be handled separately below; permutations not needed.
    permutations.push({ fba: true });
  } else if (strategy === 'online') {
    permutations.push({ username: usernameEnv, password: passwordEnv });
  } else if (/onprem/.test(strategy)) {
    const baseUser = usernameEnv.includes('\\') ? usernameEnv.split('\\')[1] : usernameEnv;
    const rawDomainCandidates: string[] = [];
    if (domainEnv) rawDomainCandidates.push(domainEnv);
    if (domainEnv.includes('.')) rawDomainCandidates.push(domainEnv.split('.')[0]);
    // De-duplicate & add uppercase versions
    const domainCandidates = Array.from(
      new Set(rawDomainCandidates.flatMap((d) => [d, d.toUpperCase()]))
    ).filter(Boolean);
    // Always include empty domain variant
    domainCandidates.push('');

    const userFormats = new Set<string>();
    // If SP_USERNAME already DOMAIN\\user keep that exact first
    if (usernameEnv.includes('\\')) userFormats.add(usernameEnv);
    for (const dom of domainCandidates) {
      if (dom) userFormats.add(`${dom}\\${baseUser}`);
    }
    userFormats.add(baseUser); // plain user last
    for (const formatted of userFormats) {
      if (formatted.includes('\\')) {
        permutations.push({ username: formatted, password: passwordEnv, workstation: ws });
      } else {
        for (const dom of domainCandidates) {
          if (!dom) continue;
          permutations.push({
            username: formatted,
            password: passwordEnv,
            domain: dom,
            workstation: ws,
          });
        }
        permutations.push({ username: formatted, password: passwordEnv, workstation: ws });
      }
    }
    if (extraModes.includes('fba')) {
      const baseUser = usernameEnv.includes('\\') ? usernameEnv.split('\\')[1] : usernameEnv;
      permutations.push({ username: baseUser, password: passwordEnv, fba: true, workstation: ws });
      if (domainEnv)
        permutations.push({
          username: baseUser,
          password: passwordEnv,
          domain: domainEnv,
          fba: true,
          workstation: ws,
        });
    }
    // Allow developer to force only the first credential permutation for faster iteration
    if (forceSingle && permutations.length > 1) {
      const first = permutations[0];
      permutations.length = 0;
      permutations.push(first);
    }
  } else {
    throw new Error(`Unsupported SP_STRATEGY: ${strategy}`);
  }

  if (allowSelfSigned) {
    for (const perm of permutations) {
      perm.rejectUnauthorized = false;
    }
  }

  // TLS adjustments
  if (allowSelfSigned) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  } else {
    const trustedCa = getTrustedCaPath(instance);
    if (!trustedCa) {
      delete process.env.NODE_EXTRA_CA_CERTS;
    } else {
      const baseDir =
        typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '.';
      const caPath = path.isAbsolute(trustedCa) ? trustedCa : path.join(baseDir, trustedCa);
      if (fs.existsSync(caPath)) {
        process.env.NODE_EXTRA_CA_CERTS = caPath;
      }
    }
  }

  if (!allowSelfSigned && !getTrustedCaPath(instance) && process.env.SP_TRUSTED_CA_PATH) {
    const baseDir =
      typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '.';
    const caPath = path.isAbsolute(process.env.SP_TRUSTED_CA_PATH)
      ? process.env.SP_TRUSTED_CA_PATH
      : path.join(baseDir, process.env.SP_TRUSTED_CA_PATH);
    if (fs.existsSync(caPath)) {
      process.env.NODE_EXTRA_CA_CERTS = caPath;
    }
  }

  debugLog('auth attempt', {
    strategy,
    siteUrl,
    user: usernameEnv.includes('\\') ? usernameEnv.split('\\')[1] : usernameEnv,
    domain: domainEnv || (usernameEnv.includes('\\') ? usernameEnv.split('\\')[0] : undefined),
    workstation: workstationEnv,
    cached: false,
  });
  debugLog('permutations prepared', {
    count: permutations.length,
    samples: permutations.slice(0, 3).map((p) => ({ ...p, password: '***' })),
  });

  // NTLM deep diagnostic: capture raw Type2 challenge and try decoding manually
  if (/onprem/.test(strategy) && strategy !== 'fba' && process.env.SP_NTLM_DIAG === 'true') {
    try {
      const helpers = await loadNtlmHelpers();
      if (!helpers.createType1Message) {
        debugLog('ntlm diag skipped: node-ntlm-client not available');
      } else {
        const diagDomain = (
          domainEnv || (usernameEnv.includes('\\') ? usernameEnv.split('\\')[0] : '')
        ).split('.')[0];
        const workstation = (
          workstationEnv ||
          os.hostname().split('.')[0] ||
          'WORKSTATION'
        ).toUpperCase();
        const type1 = helpers.createType1Message({
          domain: diagDomain || undefined,
          workstation,
        });
        debugLog('ntlm diag sending type1', { domain: diagDomain || undefined, workstation });
        const r1 = await fetch(siteUrl, {
          method: 'GET',
          headers: { Authorization: `NTLM ${type1}` },
        });
        const headerChain = r1.headers.get('www-authenticate') || '';
        debugLog('ntlm diag challenge header', headerChain);
        const match = headerChain.match(/NTLM\s+([A-Za-z0-9+/=]+)/i);
        if (!match) {
          debugLog('ntlm diag no NTLM challenge token found');
        } else {
          const b64 = match[1];
          let buf: Buffer | null = null;
          try {
            buf = Buffer.from(b64, 'base64');
          } catch (error) {
            debugLog('ntlm diag base64 decode failed', toExtendedError(error).message);
          }
          if (buf) {
            const hexPreview = buf.slice(0, 32).toString('hex');
            debugLog('ntlm diag type2 meta', {
              b64Len: b64.length,
              bufLen: buf.length,
              hexPreview,
            });
            try {
              const decoded = helpers.decodeType2Message(b64);
              debugLog('ntlm diag decode success', {
                targetName: decoded.targetName,
                flags: decoded.negotiateFlags,
              });
            } catch (error) {
              debugLog('ntlm diag decode failed', { message: toExtendedError(error).message });
            }
          }
        }
      }
    } catch (error) {
      debugLog('ntlm diag unexpected error', toExtendedError(error).message);
    }
  }

  let lastErr: unknown;
  // Optional preflight to inspect WWW-Authenticate header chain for diagnosis
  if (process.env.SP_PRECHECK === 'true') {
    try {
      const pre = await fetch(siteUrl, { method: 'GET' });
      debugLog('precheck response', {
        status: pre.status,
        www: pre.headers.get('www-authenticate'),
      });
      if (process.env.SP_DUMP_ROOT === 'true') {
        try {
          const text = await pre.text();
          debugLog('precheck body snippet', text.substring(0, 300).replace(/\s+/g, ' ').trim());
        } catch (error) {
          debugLog('precheck body read failed', getErrorMessage(error));
        }
      }
    } catch (error) {
      debugLog('precheck failed', { message: getErrorMessage(error) });
    }
  }
  if (strategy === 'fba') {
    try {
      debugLog('fba auth start', { siteUrl, user: usernameEnv });
      const fba = await fbaLogin(
        siteUrl,
        usernameEnv.includes('\\') ? usernameEnv.split('\\')[1] : usernameEnv,
        passwordEnv
      );
      const headers: Record<string, string> = {
        Cookie: fba.cookie,
        Accept: 'application/json;odata=verbose',
      };
      const cached = { headers, expires: fba.expires };
      setCachedAuth(cacheKey, cached);
      debugLog('fba auth success', { cachedUntil: new Date(cached.expires).toISOString() });
      return cached;
    } catch (error) {
      debugLog('fba auth failed', getErrorMessage(error));
      lastErr = error;
    }
  } else {
    // WORKAROUND: node-sp-auth v3.x uses 'got' library internally which has agent compatibility issues
    // The 'got' library expects agents in format { http: agent, https: agent } but node-sp-auth doesn't
    // expose a way to pass custom agents. When HTTP_PROXY/HTTPS_PROXY are set, 'got' tries to create
    // its own proxy agent but fails with: "Expected 'options.agent' properties to be 'http', 'https' or 'http2'"
    // Solution: Prefer direct connections, but allow env override + automatic fallback without proxies.
    const needsProxy =
      instance?.sharePoint.needsProxy === true ||
      process.env.SP_NODE_SP_AUTH_NEEDS_PROXY === 'true';
    const proxyAgentErrorRegex =
      /Expected the `options\.agent` properties to be `http`, `https` or `http2`/i;
    const ttlMs = 30 * 60 * 1000;

    for (let i = 0; i < permutations.length; i++) {
      const attemptCreds = permutations[i];
      const disableProxyForPrimary = !needsProxy;
      try {
        debugLog('auth attempt', {
          idx: i,
          total: permutations.length,
          creds: { ...attemptCreds, password: '***' },
          mode: disableProxyForPrimary ? 'direct' : 'proxy-enabled',
        });
        const context = await executeNodeSpAuthAttempt(
          siteUrl,
          attemptCreds,
          disableProxyForPrimary,
          disableProxyForPrimary ? 'primary-direct' : 'primary-proxy'
        );
        const cached = { ...context, expires: Date.now() + ttlMs };
        setCachedAuth(cacheKey, cached);
        debugLog('auth success', {
          idx: i,
          mode: disableProxyForPrimary ? 'direct' : 'proxy-enabled',
          cachedUntil: new Date(cached.expires).toISOString(),
        });
        return cached;
      } catch (error) {
        const err = toExtendedError(error);
        lastErr = err;
        const message = err.message || '';
        debugLog('auth attempt failed', {
          idx: i,
          message,
          name: err.name,
          stackFirst: (err.stack || '').split('\n').slice(0, 2).join(' | '),
        });

        const shouldRetryWithoutProxy =
          !disableProxyForPrimary && proxyAgentErrorRegex.test(message);
        if (shouldRetryWithoutProxy) {
          debugLog(
            'node-sp-auth proxy agent error detected. Retrying authentication with proxies disabled.'
          );
          try {
            const context = await executeNodeSpAuthAttempt(
              siteUrl,
              attemptCreds,
              true,
              'proxy-fallback'
            );
            const cached = { ...context, expires: Date.now() + ttlMs };
            setCachedAuth(cacheKey, cached);
            debugLog('auth success', {
              idx: i,
              mode: 'proxy-fallback',
              cachedUntil: new Date(cached.expires).toISOString(),
            });
            return cached;
          } catch (fallbackErr) {
            debugLog('proxy fallback attempt failed', {
              idx: i,
              message: getErrorMessage(fallbackErr),
            });
            lastErr = fallbackErr;
          }
        }

        if (!/invalid argument/i.test(message)) break;
      }
    }

    // Manual NTLM fallback (some farms emit challenge format that node-sp-auth fails to parse)
    const lastErrMessage = getErrorMessage(lastErr);
    if (manualNtlmEnabled && lastErr && /invalid argument/i.test(lastErrMessage)) {
      try {
        const helpers = await loadNtlmHelpers();
        if (!helpers.createType1Message || !helpers.createType3Message) {
          debugLog('manual ntlm fallback unavailable (node-ntlm-client missing)');
        } else {
          const firstCred = assertOnPremCredential(permutations[0]);
          const workstation = (
            firstCred.workstation ||
            os.hostname().split('.')[0] ||
            'WORKSTATION'
          ).toUpperCase();
          // Derive domain & username pieces
          let user = firstCred.username;
          let domain = (firstCred.domain || '').split('.')[0];
          if (user.includes('\\')) {
            const parts = user.split('\\');
            domain = domain || parts[0];
            user = parts[1];
          }
          // Build candidate URLs (root + API endpoints) because some farms only emit full challenge on _api endpoints
          const siteCandidatesBase = [siteUrl, siteUrl.endsWith('/') ? siteUrl : siteUrl + '/'];
          // Ensure API variants start with a leading slash
          const apiVariants = ['/_api/web/', '/_api/web/?$select=Title'];
          const siteCandidates = Array.from(
            new Set([
              ...siteCandidatesBase,
              ...siteCandidatesBase.map((b) => b.replace(/\/+$/, '/') + apiVariants[0]),
              ...siteCandidatesBase.map((b) => b.replace(/\/+$/, '/') + apiVariants[1]),
            ])
          );
          let type2b64: string | null = null;
          let lastHeaderChain = '';
          const type1 = helpers.createType1Message({ domain: domain || undefined, workstation });
          for (let attemptIdx = 0; attemptIdx < siteCandidates.length && !type2b64; attemptIdx++) {
            const candidate = siteCandidates[attemptIdx];
            debugLog('manual ntlm: sending type1', {
              domain: domain || undefined,
              workstation,
              url: candidate,
              attemptIdx,
            });
            // 0. Preflight WITHOUT Authorization (some IIS setups need this first empty 401 before honoring Type1)
            let preStatus: number | undefined;
            try {
              const pre = await fetch(candidate, {
                method: 'GET',
                headers: {
                  'User-Agent': 'ManualNTLM-Preflight',
                  Accept: '*/*',
                  Connection: 'keep-alive',
                },
              });
              preStatus = pre.status;
              const preWWW = pre.headers.get('www-authenticate') || '';
              debugLog('manual ntlm: preflight status', { status: preStatus, www: preWWW });
            } catch (preErr) {
              debugLog('manual ntlm: preflight error', getErrorMessage(preErr));
            }
            // 1. First minimal request WITH Type1
            const r1 = await fetch(candidate, {
              method: 'GET',
              headers: {
                Authorization: `NTLM ${type1}`,
                'User-Agent': 'ManualNTLM/Type1',
                Accept: '*/*',
                Connection: 'keep-alive',
              },
            });
            let header = r1.headers.get('www-authenticate') || '';
            lastHeaderChain = header;
            if (!header) {
              const keys: string[] = [];
              r1.headers.forEach((_, k) => keys.push(k));
              debugLog('manual ntlm: first response had no www-authenticate', {
                status: r1.status,
                keys,
              });
            } else {
              debugLog('manual ntlm: first attempt status', { status: r1.status });
            }
            let m = header.match(/NTLM\s+([A-Za-z0-9+/=]+)(?:[,\s]|$)/i);
            if (!m) {
              debugLog('manual ntlm: first type1 no type2 headerChain', header);
              // Second richer variant
              const r1b = await fetch(candidate, {
                method: 'GET',
                headers: {
                  Authorization: `NTLM ${type1}`,
                  'User-Agent': 'Mozilla/5.0 (ManualNTLM)',
                  Accept: '*/*',
                  Connection: 'keep-alive',
                },
              });
              header = r1b.headers.get('www-authenticate') || '';
              lastHeaderChain = header;
              debugLog('manual ntlm: second attempt headerChain', header);
              m = header.match(/NTLM\s+([A-Za-z0-9+/=]+)(?:[,\s]|$)/i);
              if (!m) {
                // Third attempt with extended headers (Accept-Language & OData Accept) sometimes triggers full NTLM challenge
                const r1c = await fetch(candidate, {
                  method: 'GET',
                  headers: {
                    Authorization: `NTLM ${type1}`,
                    'User-Agent': 'Mozilla/5.0 (ManualNTLM Extended)',
                    Accept: 'application/json;odata=verbose,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
                    Connection: 'keep-alive',
                  },
                });
                header = r1c.headers.get('www-authenticate') || '';
                lastHeaderChain = header;
                debugLog('manual ntlm: third attempt headerChain', header);
                m = header.match(/NTLM\s+([A-Za-z0-9+/=]+)(?:[,\s]|$)/i);
              }
              if (!m) {
                try {
                  const rawHeaders: string[] = await new Promise((resolveRaw, rejectRaw) => {
                    const u = new NodeURL(candidate);
                    const opts = {
                      method: 'GET',
                      protocol: u.protocol,
                      hostname: u.hostname,
                      port: u.port || 443,
                      path: u.pathname + (u.search || ''),
                      headers: {
                        Authorization: `NTLM ${type1}`,
                        'User-Agent': 'ManualNTLMRaw/1.0',
                        Accept: '*/*',
                      },
                    };
                    const req = https.request(opts, (res) => {
                      resolveRaw(res.rawHeaders || []);
                    });
                    req.on('error', rejectRaw);
                    req.end();
                  });
                  const wwwValues: string[] = [];
                  for (let i = 0; i < rawHeaders.length; i += 2) {
                    const k = rawHeaders[i];
                    const v = rawHeaders[i + 1];
                    if (k && /^(www-authenticate)$/i.test(k)) wwwValues.push(v);
                  }
                  debugLog('manual ntlm: raw probe www-auth lines', {
                    candidate,
                    lines: wwwValues,
                  });
                  for (const v of wwwValues) {
                    const mm = v.match(/NTLM\s+([A-Za-z0-9+/=]+)(?:[,\s]|$)/i);
                    if (mm) {
                      m = mm;
                      header = v;
                      lastHeaderChain = v;
                      break;
                    }
                  }
                } catch (rawErr) {
                  debugLog('manual ntlm: raw probe error', getErrorMessage(rawErr));
                }
                // Optional deep socket probe (TLS) to see unmodified multiple WWW-Authenticate lines
                if (!m && ntlmSocketProbeEnabled) {
                  try {
                    const u = new NodeURL(candidate);
                    const pathPart = u.pathname + (u.search || '');
                    const hostHeader = u.host;
                    const type1Line = `Authorization: NTLM ${type1}`;
                    const requestLines = [
                      `GET ${pathPart || '/'} HTTP/1.1`,
                      `Host: ${hostHeader}`,
                      'User-Agent: curl/7.76.1',
                      'Accept: */*',
                      'Connection: close',
                      type1Line,
                      '',
                      '',
                    ];
                    const rawResp: string = await new Promise((resolveSock, rejectSock) => {
                      const tlsOptions: tls.ConnectionOptions = {
                        host: u.hostname,
                        port: u.port ? Number(u.port) : 443,
                        servername: u.hostname,
                      };
                      const socket = tls.connect(tlsOptions, () => {
                        socket.write(requestLines.join('\r\n'));
                      });
                      let dataBuf = '';
                      socket.on('data', (chunk: Buffer) => {
                        dataBuf += chunk.toString('utf8');
                      });
                      socket.on('error', (se: Error) => rejectSock(se));
                      socket.on('end', () => resolveSock(dataBuf));
                      socket.setTimeout(5000, () => {
                        try {
                          socket.destroy();
                        } catch {
                          /* ignore */
                        }
                        rejectSock(new Error('socket timeout'));
                      });
                    });
                    const headerSection = rawResp.split(/\r?\n\r?\n/)[0];
                    const headerLines = headerSection.split(/\r?\n/).slice(1); // skip status line
                    const wwwLines = headerLines.filter((l) => /^www-authenticate:/i.test(l));
                    debugLog('manual ntlm: tls socket probe lines', wwwLines);
                    for (const l of wwwLines) {
                      const mm = l.match(/NTLM\s+([A-Za-z0-9+/=]+)(?:[,\s]|$)/i);
                      if (mm) {
                        m = mm;
                        header = l;
                        lastHeaderChain = l;
                        break;
                      }
                    }
                  } catch (sockErr) {
                    debugLog('manual ntlm: socket probe error', getErrorMessage(sockErr));
                  }
                }
              }
            }
            if (m) {
              type2b64 = m[1];
              debugLog('manual ntlm: got type2', {
                b64Len: type2b64.length,
                preview: type2b64.substring(0, 24) + '...',
                urlVariant: candidate,
              });
              break;
            }
          }
          if (!type2b64)
            throw new Error(
              'manual ntlm: no type2 token after variants. lastHeaderChain=' + lastHeaderChain
            );
          debugLog('manual ntlm: got type2', {
            b64Len: type2b64.length,
            preview: type2b64.substring(0, 24) + '...',
          });
          let type3: string;
          try {
            type3 = helpers.createType3Message(type2b64, {
              username: user,
              password: passwordEnv,
              domain,
              workstation,
            });
          } catch (ee) {
            throw new Error(`manual ntlm: createType3 failed: ${getErrorMessage(ee)}`);
          }
          const r2 = await fetch(siteUrl + '/_api/web?$select=Title', {
            method: 'GET',
            headers: { Authorization: `NTLM ${type3}`, Accept: 'application/json;odata=verbose' },
          });
          if (r2.status === 200) {
            debugLog('manual ntlm: handshake success');
            const headers: Record<string, string> = {
              Authorization: `NTLM ${type3}`,
              Accept: 'application/json;odata=verbose',
            };
            // Short TTL because connection affinity might matter
            const cached = { headers, expires: Date.now() + 5 * 60 * 1000 };
            setCachedAuth(cacheKey, cached);
            return cached;
          } else {
            const h2 = r2.headers.get('www-authenticate');
            throw new Error('manual ntlm: final request failed status ' + r2.status + ' www=' + h2);
          }
        }
      } catch (mf) {
        debugLog('manual ntlm fallback failed', getErrorMessage(mf));
        // Experimental persistent-socket NTLM handshake (some IIS setups require same TCP connection for 401->Type1->Type3)
        if (ntlmPersistentEnabled) {
          try {
            debugLog('manual ntlm: attempting persistent socket handshake');
            const firstCred = assertOnPremCredential(permutations[0]);
            let pUser = firstCred.username;
            let pDomain = (firstCred.domain || '').split('.')[0];
            if (pUser.includes('\\')) {
              const parts = pUser.split('\\');
              pDomain = pDomain || parts[0];
              pUser = parts[1];
            }
            const workstation = (
              firstCred.workstation ||
              os.hostname().split('.')[0] ||
              'WORKSTATION'
            ).toUpperCase();
            const helpers = await loadNtlmHelpers();
            if (!helpers.createType1Message || !helpers.createType3Message) {
              debugLog('manual ntlm: persistent socket: ntlm helpers missing');
              throw new Error('ntlm helpers unavailable');
            }
            // We'll target an API endpoint to encourage full challenge
            const target = siteUrl.replace(/\/$/, '') + '/_api/web/?$select=Title';
            const u = new NodeURL(target);
            const host = u.hostname;
            const port = parseInt(u.port || '443', 10);
            const pathPart = u.pathname + (u.search || '');
            function readHeadersFromBuffer(
              buf: string
            ): { statusLine: string; lines: string[]; remainder: string } | null {
              const idx = buf.indexOf('\r\n\r\n');
              if (idx === -1) return null;
              const headerSection = buf.substring(0, idx);
              const lines = headerSection.split(/\r?\n/);
              const statusLine = lines.shift() || '';
              return { statusLine, lines, remainder: buf.substring(idx + 4) };
            }
            const type1Msg = helpers.createType1Message({
              domain: pDomain || undefined,
              workstation,
            });
            const socket = tls.connect({ host, port, servername: host });
            let stage = 0;
            let buffer = '';
            let type2Token: string | null = null;
            const writeReq = (headersArr: string[]) => {
              const reqLines = [
                `GET ${pathPart || '/'} HTTP/1.1`,
                `Host: ${u.host}`,
                'User-Agent: ManualNTLM-Persistent/1.0',
                'Accept: */*',
                'Connection: keep-alive',
                ...headersArr,
                '',
                '',
              ];
              socket.write(reqLines.join('\r\n'));
            };
            const result = await new Promise<{
              success: boolean;
              type2Token: string | null;
            } | null>((resolvePersist, rejectPersist) => {
              const timeout = setTimeout(() => {
                try {
                  socket.destroy();
                } catch {
                  /* ignore */
                }
                rejectPersist(new Error('persistent socket timeout'));
              }, 8000);
              socket.on('error', (se: Error) => {
                clearTimeout(timeout);
                rejectPersist(se);
              });
              socket.on('data', (chunk: Buffer) => {
                buffer += chunk.toString('utf8');
                let parsed: { statusLine: string; lines: string[]; remainder: string } | null;
                while ((parsed = readHeadersFromBuffer(buffer))) {
                  const { statusLine, lines, remainder } = parsed;
                  buffer = remainder; // discard headers portion
                  stage++;
                  debugLog('persistent socket: stage headers', {
                    stage,
                    statusLine,
                    lines: lines.filter((l) => /^www-authenticate:/i.test(l)),
                  });
                  if (stage === 1) {
                    // First unauthenticated 401 expected
                    // Send Type1
                    writeReq([`Authorization: NTLM ${type1Msg}`]);
                  } else if (stage === 2) {
                    // Should contain Type2 challenge
                    const wwwLines = lines.filter((l) => /^www-authenticate:/i.test(l));
                    for (const l of wwwLines) {
                      const mm = l.match(/NTLM\s+([A-Za-z0-9+/=]+)(?:[,\s]|$)/i);
                      if (mm) {
                        type2Token = mm[1];
                        break;
                      }
                    }
                    if (!type2Token) {
                      rejectPersist(new Error('persistent socket: no type2 token'));
                      return;
                    }
                    debugLog('persistent socket: got type2', {
                      b64Len: type2Token.length,
                      preview: type2Token.substring(0, 24) + '...',
                    });
                    let type3Msg: string;
                    try {
                      type3Msg = helpers.createType3Message(type2Token, {
                        username: pUser,
                        password: passwordEnv,
                        domain: pDomain,
                        workstation,
                      });
                    } catch (ce) {
                      rejectPersist(
                        new Error(`persistent socket: createType3 failed: ${getErrorMessage(ce)}`)
                      );
                      return;
                    }
                    writeReq([
                      `Authorization: NTLM ${type3Msg}`,
                      'Accept: application/json;odata=verbose',
                    ]);
                  } else if (stage === 3) {
                    // Final response; expect 200
                    if (!/^HTTP\/1\.1 200 /i.test(statusLine)) {
                      rejectPersist(
                        new Error('persistent socket: final status not 200: ' + statusLine)
                      );
                      return;
                    }
                    clearTimeout(timeout);
                    resolvePersist({ success: true, type2Token });
                  } else if (stage > 3) {
                    // Extra responses unexpected
                    clearTimeout(timeout);
                    rejectPersist(new Error('persistent socket: too many stages'));
                  }
                }
              });
              socket.on('secureConnect', () => {
                // Initial unauthenticated request (to elicit 401)
                writeReq([]);
              });
            });
            if (result && result.success) {
              // We already sent Type3 inside the socket; cannot reuse Authorization because server expects handshake per connection.
              // However we can cache a dummy header to keep higher layers satisfied and mark success for diagnostics.
              debugLog('manual ntlm: persistent socket handshake success');
              const headers: Record<string, string> = { 'X-NTLM-Persistent': 'true' };
              const cached = { headers, expires: Date.now() + 60 * 1000 };
              setCachedAuth(cacheKey, cached);
              return cached;
            }
          } catch (perr) {
            debugLog('manual ntlm: persistent socket failed', getErrorMessage(perr));
          }
        }
      }
    }
  }
  if (lastErr instanceof Error) throw lastErr;
  throw new Error('Unknown SharePoint auth failure');
}
