import https from 'https';
import fs from 'fs';
import path from 'path';
import { Agent as UndiciAgent, Dispatcher } from 'undici';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Optional HTTPS agent to allow custom CA or self-signed certs for on-prem SharePoint
// Environment variables:
//   SP_TRUSTED_CA_PATH: Absolute (or relative to project root) path to a PEM file containing the trusted CA chain.
//   SP_ALLOW_SELF_SIGNED: 'true' to disable TLS verification (NOT recommended for production).

let agent: https.Agent | undefined;
let dispatcher: Dispatcher | undefined;

function resolvePathMaybe(p: string | undefined) {
  if (!p) return undefined;
  if (path.isAbsolute(p)) return p;
  return path.join(process.cwd(), p);
}

try {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const caPath = resolvePathMaybe(process.env.SP_TRUSTED_CA_PATH);

  // IMPORTANT: Avoid forcing proxy agents globally here.
  // Let each HTTP client (fetch/got/undici) handle HTTP_PROXY/HTTPS_PROXY env vars themselves.
  // If you need a custom proxy agent, use SP_CUSTOM_PROXY_AGENT=true to enable
  if (proxyUrl && process.env.SP_CUSTOM_PROXY_AGENT === 'true') {
    // Use proxy agent (handles Windows auth via CNTLM/Px proxy)
    agent = new HttpsProxyAgent(proxyUrl) as unknown as https.Agent;
    dispatcher = new UndiciAgent({
      connect: { rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0' },
    });
    // eslint-disable-next-line no-console
    console.log('[httpsAgent] Using custom proxy agent:', proxyUrl);
  } else if (proxyUrl) {
    // Proxy configured but not creating custom agent - let libraries handle it via env vars
    // eslint-disable-next-line no-console
    console.log(
      '[httpsAgent] Proxy detected but not creating custom agent (libraries will use HTTP_PROXY env var):',
      proxyUrl
    );
  } else if (caPath && fs.existsSync(caPath)) {
    const ca = fs.readFileSync(caPath, 'utf8');
    agent = new https.Agent({ ca });
    dispatcher = new UndiciAgent({ connect: { ca } });
    // Set NODE_EXTRA_CA_CERTS early so any other libraries relying on OpenSSL store see it
    if (!process.env.NODE_EXTRA_CA_CERTS) {
      process.env.NODE_EXTRA_CA_CERTS = caPath;
    }
    // eslint-disable-next-line no-console
    console.log('[httpsAgent] Using custom CA from', caPath);
  } else if (process.env.SP_ALLOW_SELF_SIGNED === 'true') {
    agent = new https.Agent({ rejectUnauthorized: false });
    dispatcher = new UndiciAgent({ connect: { rejectUnauthorized: false } });
    // eslint-disable-next-line no-console
    console.warn(
      '[httpsAgent] SP_ALLOW_SELF_SIGNED=true -> TLS certificate verification DISABLED. Do not use in production.'
    );
  } else {
    // eslint-disable-next-line no-console
    console.log('[httpsAgent] No custom CA configured; relying on system trust store');
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[httpsAgent] Failed to configure HTTPS agent', e);
}

export const sharePointHttpsAgent = agent;
export const sharePointDispatcher = dispatcher;
