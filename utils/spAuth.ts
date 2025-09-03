import { getAuth } from 'node-sp-auth';
import { resolveSharePointSiteUrl } from './sharepointEnv';

export async function getSharePointAuthHeaders(): Promise<Record<string,string>> {
  const siteUrl = resolveSharePointSiteUrl();
  const strategy = process.env.SP_STRATEGY || 'online';

  // Build credentials object based on strategy
  let creds: any;
  if (strategy === 'online') {
    creds = { username: process.env.SP_USERNAME, password: process.env.SP_PASSWORD }; // SPO credentials
  } else if (strategy === 'onprem-ntlm') {
    creds = { username: process.env.SP_USERNAME, password: process.env.SP_PASSWORD, domain: process.env.SP_ONPREM_DOMAIN }; // NTLM
  } else {
    throw new Error(`Unsupported SP_STRATEGY: ${strategy}`);
  }

  const auth = await getAuth(siteUrl, creds);
  // auth.headers contains Authorization / Cookie etc.
  return auth.headers as Record<string,string>;
}
