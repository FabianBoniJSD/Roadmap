// Lightweight ambient Node & Next shims (avoid needing full type packages)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;
// Minimal local types to avoid importing 'next'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface NextApiRequest { method?: string; headers: Record<string, any>; query: any; body: any; }
interface NextApiResponse {
  status: (code: number) => NextApiResponse;
  json: (data: any) => void;
  setHeader?: (name: string, value: string) => void;
}
// @ts-ignore - node core types may be absent in this minimal debug environment
import os from 'os';
// Use require to avoid needing dns type definitions
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dns = require('dns');
import { resolveSharePointSiteUrl } from '@/utils/sharepointEnv';
import { sharePointHttpsAgent, sharePointDispatcher } from '@/utils/httpsAgent';

// Loose types for optional dependency
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NtlmLib = any;

interface NtlmDecodeSuccess { success: true; targetName?: string; flags?: unknown }
interface NtlmDecodeFail { success: false; error: string }
interface NtlmAnalysis {
  found: boolean;
  b64Length?: number;
  byteLength?: number;
  hexPreview?: string | null;
  decode?: NtlmDecodeSuccess | NtlmDecodeFail;
}

let ntlmLib: NtlmLib | null = null;
function loadNtlm(): NtlmLib | null {
  if (ntlmLib) return ntlmLib;
  try { ntlmLib = require('node-ntlm-client'); } catch { ntlmLib = null; }
  return ntlmLib;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.SP_PROXY_DEBUG !== 'true') {
    return res.status(403).json({ error: 'Disabled' });
  }
  const started = Date.now();
  const site = resolveSharePointSiteUrl();
  const ntlm = loadNtlm();
  if (!ntlm) return res.status(500).json({ error: 'node-ntlm-client not available' });

  try {
    const timing: Record<string, number> = {};
    const domainRaw = process.env.SP_ONPREM_DOMAIN || '';
    const domain = domainRaw ? domainRaw.split('.')[0] : undefined;
    const workstation = (process.env.SP_ONPREM_WORKSTATION || os.hostname().split('.')[0] || 'WORKSTATION').toUpperCase();
    if (process.env.SP_ALLOW_SELF_SIGNED === 'true') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    // Preflight
    let preflight: any = {};
    try {
      const t0 = Date.now();
      const pre = await fetch(site, {
        method: 'GET',
        // @ts-ignore
        dispatcher: process.env.SP_DISABLE_DISPATCHER === 'true' ? undefined : (sharePointDispatcher || undefined),
        // @ts-ignore
        agent: sharePointHttpsAgent
      });
      timing.preflight = Date.now() - t0;
      preflight = { status: pre.status, www: pre.headers.get('www-authenticate') };
    } catch (e) {
      timing.preflight = Date.now() - started;
      preflight = { error: (e as Error).message };
    }

    // DNS
    let dnsDiag: any = {};
    try {
      const host = new URL(site).hostname;
      const addresses = await new Promise((resolve) => {
        dns.lookup(host, { all: true }, (err, addrs) => {
          if (err) resolve([{ error: err.message }]); else resolve(addrs);
        });
      });
      dnsDiag = { host, addresses };
    } catch (e) {
      dnsDiag = { error: (e as Error).message };
    }

    const type1 = ntlm.createType1Message({ domain, workstation });
    let r1: Response | undefined; let fetchErr: Error | null = null;
    try {
      const t0 = Date.now();
      r1 = await fetch(site, {
        method: 'GET',
        headers: { Authorization: `NTLM ${type1}` },
        // @ts-ignore
        dispatcher: process.env.SP_DISABLE_DISPATCHER === 'true' ? undefined : (sharePointDispatcher || undefined),
        // @ts-ignore
        agent: sharePointHttpsAgent
      });
      timing.type1 = Date.now() - t0;
    } catch (e) {
      timing.type1 = Date.now() - started;
      fetchErr = e as Error;
    }

    if (fetchErr || !r1) {
      let plainProbe: any = {};
      try {
        const t0 = Date.now();
        const plain = await fetch(site, {
          method: 'GET',
          // @ts-ignore
          dispatcher: process.env.SP_DISABLE_DISPATCHER === 'true' ? undefined : (sharePointDispatcher || undefined),
          // @ts-ignore
          agent: sharePointHttpsAgent
        });
        timing.plainProbe = Date.now() - t0;
        plainProbe = { status: plain.status, www: plain.headers.get('www-authenticate') };
      } catch (e2) {
        timing.plainProbe = Date.now() - started;
        const err2 = e2 as Error & { code?: string; cause?: { message?: string } };
        plainProbe = { error: err2.message, code: err2.code, cause: err2.cause && err2.cause.message };
      }
      const err = fetchErr as Error & { code?: string; cause?: { message?: string } };
      return res.status(502).json({
        site,
        version: '2',
        request: { domain, workstation },
        preflight,
        fetchError: fetchErr ? { message: err.message, code: err.code, cause: err.cause && err.cause.message } : undefined,
        plainProbe,
        dns: dnsDiag,
        timing: { ...timing, total: Date.now() - started },
        env: {
          node: process.versions.node,
          allowSelfSigned: process.env.SP_ALLOW_SELF_SIGNED === 'true',
          disableDispatcher: process.env.SP_DISABLE_DISPATCHER === 'true'
        },
        transport: {
          agentKind: sharePointHttpsAgent && (sharePointHttpsAgent as any)?.constructor?.name,
          dispatcherKind: sharePointDispatcher && (sharePointDispatcher as any)?.constructor?.name
        }
      });
    }

    const www = r1.headers.get('www-authenticate') || '';
    const match = www.match(/NTLM\s+([A-Za-z0-9+/=]+)/i);
    const analysis: NtlmAnalysis = { found: false };
    if (match) {
      const b64 = match[1];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let buf: any = null;
      try { buf = Buffer.from(b64, 'base64'); } catch { /* ignore */ }
      analysis.found = true;
      analysis.b64Length = b64.length;
      analysis.byteLength = buf ? buf.length : 0;
      analysis.hexPreview = buf ? buf.slice(0, 64).toString('hex') : null;
      try {
        const decoded = ntlm.decodeType2Message(b64);
        analysis.decode = { success: true, targetName: decoded.targetName, flags: decoded.negotiateFlags };
      } catch (e) {
        analysis.decode = { success: false, error: (e as Error).message };
      }
    }

    // Second attempt with richer headers if first did not expose NTLM Type2
    let attempt2: any = null;
    if (!analysis.found) {
      try {
        const t0 = Date.now();
        const r2 = await fetch(site, {
          method: 'GET',
          headers: {
            Authorization: `NTLM ${type1}`,
            'User-Agent': 'Mozilla/5.0 (NTLM Diagnostic Probe)',
            'Accept': '*/*',
            'Connection': 'keep-alive'
          },
          // @ts-ignore
          dispatcher: process.env.SP_DISABLE_DISPATCHER === 'true' ? undefined : (sharePointDispatcher || undefined),
          // @ts-ignore
          agent: sharePointHttpsAgent
        });
        timing.type1Variant = Date.now() - t0;
        const www2 = r2.headers.get('www-authenticate') || '';
        const headersDump: Record<string, string[]> = {};
        r2.headers.forEach((value, key) => {
          const k = key.toLowerCase();
          if (!headersDump[k]) headersDump[k] = [];
          headersDump[k].push(value);
        });
        let secondAnalysis: NtlmAnalysis | undefined;
        const m2 = www2.match(/NTLM\s+([A-Za-z0-9+/=]+)/i);
        if (m2) {
          const b64b = m2[1];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let buf2: any = null; try { buf2 = Buffer.from(b64b, 'base64'); } catch { /* ignore */ }
          secondAnalysis = { found: true, b64Length: b64b.length, byteLength: buf2 ? buf2.length : 0, hexPreview: buf2 ? buf2.slice(0,64).toString('hex') : null };
          try { const dec2 = ntlm.decodeType2Message(b64b); secondAnalysis.decode = { success: true, targetName: dec2.targetName, flags: dec2.negotiateFlags }; } catch (e) { secondAnalysis.decode = { success: false, error: (e as Error).message }; }
          if (!analysis.found) Object.assign(analysis, secondAnalysis);
        }
        attempt2 = { status: r2.status, wwwAuthenticate: www2, headers: headersDump, ntlm: secondAnalysis };
      } catch (e) {
        attempt2 = { error: (e as Error).message };
      }
    }

    // Additional domain variant probes if still no NTLM challenge
    let domainVariantsResult: any[] | undefined;
    if (!analysis.found) {
      const originalDomain = domain;
      const envFull = process.env.SP_ONPREM_DOMAIN || '';
      const variants = Array.from(new Set([
        originalDomain,
        originalDomain ? originalDomain.toUpperCase() : undefined,
        envFull || undefined,
        envFull ? envFull.toUpperCase() : undefined,
        undefined,
        ''
      ].filter(v => v !== undefined)));
      domainVariantsResult = [];
      for (const variant of variants) {
        try {
          const t0 = Date.now();
          const t1 = ntlm.createType1Message({ domain: variant || undefined, workstation });
          const rVar = await fetch(site, {
            method: 'GET',
            headers: { Authorization: `NTLM ${t1}` },
            // @ts-ignore
            dispatcher: process.env.SP_DISABLE_DISPATCHER === 'true' ? undefined : (sharePointDispatcher || undefined),
            // @ts-ignore
            agent: sharePointHttpsAgent
          });
          const dur = Date.now() - t0;
          const wwwVar = rVar.headers.get('www-authenticate') || '';
          const mVar = wwwVar.match(/NTLM\s+([A-Za-z0-9+/=]+)/i);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let ntlmInfo: any = { found: false };
          if (mVar) {
            const b64v = mVar[1];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let bufv: any = null; try { bufv = Buffer.from(b64v, 'base64'); } catch { /* ignore */ }
            ntlmInfo.found = true;
            ntlmInfo.b64Length = b64v.length;
            ntlmInfo.byteLength = bufv ? bufv.length : 0;
            ntlmInfo.hexPreview = bufv ? bufv.slice(0, 48).toString('hex') : null;
            try { const decv = ntlm.decodeType2Message(b64v); ntlmInfo.decode = { success: true, targetName: decv.targetName, flags: decv.negotiateFlags }; } catch (e) { ntlmInfo.decode = { success: false, error: (e as Error).message }; }
            if (!analysis.found) Object.assign(analysis, ntlmInfo);
          }
          domainVariantsResult.push({ domainVariant: variant ?? null, status: rVar.status, wwwAuthenticate: wwwVar, durationMs: dur, ntlm: ntlmInfo });
          if (ntlmInfo.found) break; // stop early if we got one
        } catch (e) {
          domainVariantsResult.push({ domainVariant: variant ?? null, error: (e as Error).message });
        }
      }
    }

    // Empty domain/workstation minimal Type1 probe
    let emptyDW: any = null;
    if (!analysis.found) {
      try {
        const t0 = Date.now();
        const t1Empty = ntlm.createType1Message({ domain: '', workstation: '' });
        const rEmpty = await fetch(site, {
          method: 'GET',
          headers: { Authorization: `NTLM ${t1Empty}` },
          // @ts-ignore
          dispatcher: process.env.SP_DISABLE_DISPATCHER === 'true' ? undefined : (sharePointDispatcher || undefined),
          // @ts-ignore
          agent: sharePointHttpsAgent
        });
        const wwwE = rEmpty.headers.get('www-authenticate') || '';
        const mE = wwwE.match(/NTLM\s+([A-Za-z0-9+/=]+)/i);
        emptyDW = { status: rEmpty.status, wwwAuthenticate: wwwE, durationMs: Date.now() - t0, found: !!mE };
        if (mE && !analysis.found) {
          try {
            const decoded = ntlm.decodeType2Message(mE[1]);
            analysis.found = true; // adopt it
            analysis.decode = { success: true, targetName: decoded.targetName, flags: decoded.negotiateFlags };
          } catch {/* ignore */}
        }
      } catch (e) {
        emptyDW = { error: (e as Error).message };
      }
    }

    // Raw https request attempt (bypass fetch/undici) to detect header stripping
    let rawAttempt: any = null;
    if (!analysis.found) {
      try {
        const https = require('https');
        const urlObj = new URL(site);
        const t0 = Date.now();
        const type1raw = ntlm.createType1Message({ domain, workstation });
        rawAttempt = await new Promise((resolve) => {
          const reqOpts: any = {
            method: 'GET',
            host: urlObj.hostname,
            path: urlObj.pathname + (urlObj.search || ''),
            protocol: urlObj.protocol,
            headers: { 'Authorization': `NTLM ${type1raw}` },
            agent: sharePointHttpsAgent
          };
          const rq = https.request(reqOpts, (resp: any) => {
            const headersDump: Record<string, string|string[]> = {};
            Object.entries(resp.headers).forEach(([k,v]) => { headersDump[k] = v as any; });
            const wwwR = resp.headers['www-authenticate'] || '';
            const mR = typeof wwwR === 'string' ? wwwR.match(/NTLM\s+([A-Za-z0-9+/=]+)/i) : null;
            resolve({ status: resp.statusCode, wwwAuthenticate: wwwR, headers: headersDump, durationMs: Date.now() - t0, found: !!mR });
          });
          rq.on('error', (err: any) => resolve({ error: err.message }));
          rq.end();
        });
      } catch (e) {
        rawAttempt = { error: (e as Error).message };
      }
    }

    return res.status(200).json({
      site,
      version: '2',
      request: { domain, workstation },
      preflight,
      responseStatus: r1.status,
      wwwAuthenticate: www,
      ntlm: analysis,
      dns: dnsDiag,
      timing: { ...timing, total: Date.now() - started },
      env: {
        node: process.versions.node,
        allowSelfSigned: process.env.SP_ALLOW_SELF_SIGNED === 'true',
        disableDispatcher: process.env.SP_DISABLE_DISPATCHER === 'true'
      },
      transport: {
        agentKind: sharePointHttpsAgent && (sharePointHttpsAgent as any)?.constructor?.name,
        dispatcherKind: sharePointDispatcher && (sharePointDispatcher as any)?.constructor?.name
  },
  attempt2
  ,
  domainVariants: domainVariantsResult,
  emptyDW,
  rawAttempt
    });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
}
