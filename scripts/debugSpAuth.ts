/* eslint-disable no-console */
import { getSharePointAuthHeaders } from '../utils/spAuth';
import { resolveSharePointSiteUrl } from '../utils/sharepointEnv';

async function main() {
  try {
    const auth = await getSharePointAuthHeaders();
    const headers = auth.headers;
    const redacted: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === 'authorization' && typeof value === 'string') {
        redacted[key] = value.substring(0, 32) + '…';
      } else if (key.toLowerCase() === 'cookie' && typeof value === 'string') {
        redacted[key] = value
          .split(';')
          .map((chunk) => {
            const [name] = chunk.split('=');
            return `${name}=***`;
          })
          .join(';');
      } else {
        redacted[key] = value;
      }
    }
    console.log('[debugSpAuth] headers', redacted);
    const site = resolveSharePointSiteUrl().replace(/\/$/, '');
    const url = `${site}/_api/web/lists/getByTitle('RoadmapProjects')?$select=Id&$top=1`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json;odata=verbose',
        ...headers,
      },
    });
    const status = res.status;
    const statusText = res.statusText;
    const text = await res.text();
    console.log('[debugSpAuth] status', status, statusText);
    console.log('[debugSpAuth] body snippet', text.substring(0, 200));
  } catch (error) {
    console.error('[debugSpAuth] error', error);
    process.exitCode = 1;
  }
}

main();
