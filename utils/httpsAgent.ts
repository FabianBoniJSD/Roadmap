import https from 'https';
import fs from 'fs';
import path from 'path';
import { Agent as UndiciAgent, Dispatcher } from 'undici';

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
  const caPath = resolvePathMaybe(process.env.SP_TRUSTED_CA_PATH);
  if (caPath && fs.existsSync(caPath)) {
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
    console.warn('[httpsAgent] SP_ALLOW_SELF_SIGNED=true -> TLS certificate verification DISABLED. Do not use in production.');
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
