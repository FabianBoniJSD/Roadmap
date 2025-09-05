import { getAuth } from 'node-sp-auth';
import { resolveSharePointSiteUrl } from './sharepointEnv';
import { sharePointHttpsAgent } from './httpsAgent';
import fs from 'fs';
import path from 'path';

export async function getSharePointAuthHeaders(): Promise<Record<string,string>> {
  const siteUrl = resolveSharePointSiteUrl();
  const strategy = process.env.SP_STRATEGY || 'online';

  // Build credentials object based on strategy
  let creds: any;
  switch (strategy) {
    case 'online':
      creds = { username: process.env.SP_USERNAME, password: process.env.SP_PASSWORD };
      break;
    case 'onprem-ntlm':
      creds = { username: process.env.SP_USERNAME, password: process.env.SP_PASSWORD, domain: process.env.SP_ONPREM_DOMAIN };
      break;
    case 'onprem-userpass':
      // Classic on-prem user/pass (claims) typically same shape as NTLM but without domain if not needed
      creds = { username: process.env.SP_USERNAME, password: process.env.SP_PASSWORD, domain: process.env.SP_ONPREM_DOMAIN };
      break;
    default:
      throw new Error(`Unsupported SP_STRATEGY: ${strategy}`);
  }

  // If self-signed allowed we also flip global agent behavior (node-sp-auth may use underlying request libs)
  if (process.env.SP_ALLOW_SELF_SIGNED === 'true') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  } else if (process.env.SP_TRUSTED_CA_PATH) {
    // Provide CA bundle to Node so that underlying libs trust it
    const caPath = path.isAbsolute(process.env.SP_TRUSTED_CA_PATH)
      ? process.env.SP_TRUSTED_CA_PATH
      : path.join(process.cwd(), process.env.SP_TRUSTED_CA_PATH);
    if (fs.existsSync(caPath)) {
      process.env.NODE_EXTRA_CA_CERTS = caPath;
    }
  }

  const auth = await getAuth(siteUrl, creds);
  // auth.headers contains Authorization / Cookie etc.
  return auth.headers as Record<string,string>;
}
