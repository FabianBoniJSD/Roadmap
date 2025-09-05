import { getAuth } from 'node-sp-auth';
import { fbaLogin } from './fbaAuth';
import os from 'os';
import { resolveSharePointSiteUrl } from './sharepointEnv';
import { sharePointHttpsAgent } from './httpsAgent';
import fs from 'fs';
import path from 'path';
// Minimal ambient declarations when @types/node not fully available (build environments without node types)
// @ts-ignore
declare const require: any;
// @ts-ignore
declare const Buffer: any;
// Optional dynamic NTLM helpers (only loaded in diagnostic mode to avoid extra overhead otherwise)
let ntlmHelpers: any = null;

function loadNtlmHelpers() {
  if (ntlmHelpers) return ntlmHelpers;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const lib = require('node-ntlm-client');
    ntlmHelpers = lib;
  } catch (e) {
    ntlmHelpers = {};
  }
  return ntlmHelpers;
}

interface CachedAuth { headers: Record<string,string>; expires: number }
let cachedAuth: CachedAuth | null = null;

function debugLog(...args: any[]) {
  if (process.env.SP_PROXY_DEBUG === 'true') {
    // eslint-disable-next-line no-console
    console.debug('[spAuth]', ...args);
  }
}

export async function getSharePointAuthHeaders(): Promise<Record<string,string>> {
  const siteUrl = resolveSharePointSiteUrl();
  const strategy = process.env.SP_STRATEGY || 'online';
  const extraModes = (process.env.SP_AUTH_EXTRA || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const forceSingle = process.env.SP_FORCE_SINGLE_CREDS === 'true';

  // Simple cache to avoid repeating expensive NTLM handshake for every request.
  if (cachedAuth && cachedAuth.expires > Date.now() && process.env.SP_AUTH_NO_CACHE !== 'true') {
    return cachedAuth.headers;
  }

  const usernameEnv = process.env.SP_USERNAME || '';
  const passwordEnv = process.env.SP_PASSWORD || '';
  if (!usernameEnv || !passwordEnv) {
    throw new Error('SP_USERNAME / SP_PASSWORD not set');
  }
  const domainEnv = process.env.SP_ONPREM_DOMAIN || '';
  const workstationEnv = process.env.SP_ONPREM_WORKSTATION || undefined;

  // Build list of credential permutations (especially for NTLM) because farms differ in accepted forms
  const permutations: any[] = [];
  const ws = workstationEnv || os.hostname().split('.')[0];

  if (strategy === 'fba') {
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
    const domainCandidates = Array.from(new Set(rawDomainCandidates.flatMap(d => [d, d.toUpperCase()]))).filter(Boolean);
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
        // with explicit domain(s)
        for (const dom of domainCandidates) {
          if (!dom) continue;
          permutations.push({ username: formatted, password: passwordEnv, domain: dom, workstation: ws });
        }
        // and without domain
        permutations.push({ username: formatted, password: passwordEnv, workstation: ws });
      }
    }
    // Optional FBA (Forms Based Auth) attempts if requested via SP_AUTH_EXTRA includes 'fba'
    if (extraModes.includes('fba')) {
      const baseUser = usernameEnv.includes('\\') ? usernameEnv.split('\\')[1] : usernameEnv;
      permutations.push({ username: baseUser, password: passwordEnv, fba: true, workstation: ws });
      if (domainEnv) permutations.push({ username: baseUser, password: passwordEnv, domain: domainEnv, fba: true, workstation: ws });
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

  // TLS adjustments
  if (process.env.SP_ALLOW_SELF_SIGNED === 'true') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  } else if (process.env.SP_TRUSTED_CA_PATH) {
    const caPath = path.isAbsolute(process.env.SP_TRUSTED_CA_PATH)
      ? process.env.SP_TRUSTED_CA_PATH
      : path.join(typeof process !== 'undefined' && (process as any).cwd ? (process as any).cwd() : '.', process.env.SP_TRUSTED_CA_PATH);
    if (fs.existsSync(caPath)) {
      process.env.NODE_EXTRA_CA_CERTS = caPath;
    }
  }

  debugLog('auth attempt', { strategy, siteUrl, user: usernameEnv.includes('\\') ? usernameEnv.split('\\')[1] : usernameEnv, domain: domainEnv || (usernameEnv.includes('\\') ? usernameEnv.split('\\')[0] : undefined), workstation: workstationEnv, cached: false });
  debugLog('permutations prepared', { count: permutations.length, samples: permutations.slice(0, 3).map(p => ({ ...p, password: '***' })) });

  // NTLM deep diagnostic: capture raw Type2 challenge and try decoding manually
  if (/onprem/.test(strategy) && strategy !== 'fba' && process.env.SP_NTLM_DIAG === 'true') {
    try {
      const helpers = loadNtlmHelpers();
      if (!helpers.createType1Message) {
        debugLog('ntlm diag skipped: node-ntlm-client not available');
      } else {
        const baseUser = usernameEnv.includes('\\') ? usernameEnv.split('\\')[1] : usernameEnv;
        const diagDomain = (domainEnv || (usernameEnv.includes('\\') ? usernameEnv.split('\\')[0] : '')).split('.')[0];
        const workstation = (workstationEnv || os.hostname().split('.')[0] || 'WORKSTATION').toUpperCase();
        const type1 = helpers.createType1Message({
          domain: diagDomain || undefined,
          workstation
        });
        debugLog('ntlm diag sending type1', { domain: diagDomain || undefined, workstation });
        const r1 = await fetch(siteUrl, {
          method: 'GET',
          headers: { 'Authorization': `NTLM ${type1}` }
        });
        const headerChain = r1.headers.get('www-authenticate') || '';
        debugLog('ntlm diag challenge header', headerChain);
        const match = headerChain.match(/NTLM\s+([A-Za-z0-9+/=]+)/i);
        if (!match) {
          debugLog('ntlm diag no NTLM challenge token found');
        } else {
          const b64 = match[1];
          let buf: any = null;
            try { buf = Buffer.from(b64, 'base64'); } catch (e:any) { debugLog('ntlm diag base64 decode failed', e.message); }
          if (buf) {
            const hexPreview = buf.slice(0, 32).toString('hex');
            debugLog('ntlm diag type2 meta', { b64Len: b64.length, bufLen: buf.length, hexPreview });
            try {
              const decoded = helpers.decodeType2Message(b64);
              debugLog('ntlm diag decode success', { targetName: decoded.targetName, flags: decoded.negotiateFlags });
            } catch (e:any) {
              debugLog('ntlm diag decode failed', { message: e.message });
            }
          }
        }
      }
    } catch (e:any) {
      debugLog('ntlm diag unexpected error', e.message);
    }
  }

  let lastErr: any;
  // Optional preflight to inspect WWW-Authenticate header chain for diagnosis
  if (process.env.SP_PRECHECK === 'true') {
    try {
      const pre = await fetch(siteUrl, { method: 'GET' });
      debugLog('precheck response', { status: pre.status, www: pre.headers.get('www-authenticate') });
      if (process.env.SP_DUMP_ROOT === 'true') {
        try {
          const text = await pre.text();
          debugLog('precheck body snippet', text.substring(0, 300).replace(/\s+/g,' ').trim());
        } catch (e:any) {
          debugLog('precheck body read failed', e.message);
        }
      }
    } catch (e: any) {
      debugLog('precheck failed', { message: e.message });
    }
  }
  if (strategy === 'fba') {
    try {
      debugLog('fba auth start', { siteUrl, user: usernameEnv });
      const fba = await fbaLogin(siteUrl, usernameEnv.includes('\\') ? usernameEnv.split('\\')[1] : usernameEnv, passwordEnv);
      const headers: Record<string,string> = { Cookie: fba.cookie, Accept: 'application/json;odata=verbose' };
      cachedAuth = { headers, expires: fba.expires };
      debugLog('fba auth success', { cachedUntil: new Date(fba.expires).toISOString() });
      return headers;
    } catch (e: any) {
      debugLog('fba auth failed', e.message);
      lastErr = e;
    }
  } else {
    for (let i = 0; i < permutations.length; i++) {
      const attemptCreds = permutations[i];
      try {
        debugLog('auth attempt', { idx: i, total: permutations.length, creds: { ...attemptCreds, password: '***' } });
        const auth = await getAuth(siteUrl, attemptCreds);
        const headers = auth.headers as Record<string,string>;
        const ttlMs = 30 * 60 * 1000;
        cachedAuth = { headers, expires: Date.now() + ttlMs };
        debugLog('auth success', { idx: i, cachedUntil: new Date(cachedAuth.expires).toISOString() });
        return headers;
      } catch (e: any) {
        lastErr = e;
        debugLog('auth attempt failed', { idx: i, message: e.message, name: e.name, stackFirst: (e.stack || '').split('\n').slice(0,2).join(' | ') });
        if (!/invalid argument/i.test(e.message || '')) break;
      }
    }
  }
  throw lastErr || new Error('Unknown SharePoint auth failure');
}
