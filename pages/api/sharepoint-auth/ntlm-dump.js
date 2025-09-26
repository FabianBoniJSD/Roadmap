/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/ban-ts-comment */
// Diagnostic NTLM challenge dump (enabled only when SP_PROXY_DEBUG=true)
// Returns raw NTLM Type2 challenge metadata for troubleshooting.
// NOTE: Keep this route protected/disabled in production.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveSharePointSiteUrl } = require('../../../utils/sharepointEnv');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { sharePointHttpsAgent, sharePointDispatcher } = require('../../../utils/httpsAgent');
let ntlmLib = null;
function loadNtlm() {
  if (ntlmLib) return ntlmLib;
  try { ntlmLib = require('node-ntlm-client'); } catch { ntlmLib = null; }
  return ntlmLib;
}

module.exports = async function handler(req, res) {
  if (process.env.SP_PROXY_DEBUG !== 'true') {
    return res.status(403).json({ error: 'Disabled' });
  }
  const site = resolveSharePointSiteUrl();
  const ntlm = loadNtlm();
  if (!ntlm) return res.status(500).json({ error: 'node-ntlm-client not available' });
  try {
    const result = { version: '2' };
    const domainRaw = process.env.SP_ONPREM_DOMAIN || '';
    const domain = domainRaw ? domainRaw.split('.')[0] : undefined;
    const workstation = (process.env.SP_ONPREM_WORKSTATION || require('os').hostname().split('.')[0] || 'WORKSTATION').toUpperCase();
    // TLS relax if requested (same behavior as proxy)
    if (process.env.SP_ALLOW_SELF_SIGNED === 'true') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    // Preflight reachability without auth
    let preInfo = {};
    try {
      const pre = await fetch(site, {
        method: 'GET',
        // @ts-ignore
        dispatcher: process.env.SP_DISABLE_DISPATCHER === 'true' ? undefined : (sharePointDispatcher || undefined),
        // @ts-ignore legacy agent
        agent: sharePointHttpsAgent
      });
      preInfo = { status: pre.status, www: pre.headers.get('www-authenticate') };
    } catch (e) {
      preInfo = { error: (e && e.message) || 'preflight failed' };
    }

    const type1 = ntlm.createType1Message({ domain, workstation });
    // DNS diagnostic
    try {
      const host = new URL(site).hostname;
      const dns = require('dns');
      const addresses = await new Promise((resolve) => {
        dns.lookup(host, { all: true }, (err, addrs) => {
          if (err) resolve([{ error: err.message }]); else resolve(addrs);
        });
      });
      result.dns = { host, addresses };
    } catch (e) {
      result.dns = { error: e.message };
    }

    let r1; let fetchErr = null;
    try {
      r1 = await fetch(site, {
        method: 'GET',
        headers: { Authorization: `NTLM ${type1}` },
        // @ts-ignore
        dispatcher: process.env.SP_DISABLE_DISPATCHER === 'true' ? undefined : (sharePointDispatcher || undefined),
        // @ts-ignore
        agent: sharePointHttpsAgent
      });
    } catch (e) {
      fetchErr = e;
    }
    if (fetchErr) {
      // Plain probe without NTLM header
      let plainProbe = {};
      try {
        const plain = await fetch(site, {
          method: 'GET',
          // @ts-ignore
          dispatcher: process.env.SP_DISABLE_DISPATCHER === 'true' ? undefined : (sharePointDispatcher || undefined),
          // @ts-ignore
          agent: sharePointHttpsAgent
        });
        plainProbe = { status: plain.status, www: plain.headers.get('www-authenticate') };
      } catch (e2) {
        plainProbe = { error: e2.message, code: e2.code, cause: e2.cause && e2.cause.message };
      }
      return res.status(502).json({ site, request: { domain, workstation }, preflight: preInfo, dispatcherDisabled: process.env.SP_DISABLE_DISPATCHER === 'true', fetchError: { message: fetchErr.message, code: fetchErr.code, cause: fetchErr.cause && fetchErr.cause.message }, plainProbe, dns: result.dns });
    }
    const www = r1.headers.get('www-authenticate') || '';
    const match = www.match(/NTLM\s+([A-Za-z0-9+/=]+)/i);
    const analysis = { found: false };
    if (match) {
      const b64 = match[1];
      let buf = null;
      try { buf = Buffer.from(b64, 'base64'); } catch { /* ignore */ }
      analysis.found = true;
      analysis.b64Length = b64.length;
      analysis.byteLength = buf ? buf.length : 0;
      analysis.hexPreview = buf ? buf.slice(0, 64).toString('hex') : null;
      try {
        const decoded = ntlm.decodeType2Message(b64);
        analysis.decode = { success: true, targetName: decoded.targetName, flags: decoded.negotiateFlags };
      } catch (e) {
        analysis.decode = { success: false, error: e.message };
      }
    }
  res.status(200).json({ site, version: '2', request: { domain, workstation }, preflight: preInfo, responseStatus: r1.status, wwwAuthenticate: www, ntlm: analysis, dispatcherDisabled: process.env.SP_DISABLE_DISPATCHER === 'true', dns: result.dns });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
