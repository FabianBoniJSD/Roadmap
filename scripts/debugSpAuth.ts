/* eslint-disable no-console */
import got from 'got';
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
    let status = 0;
    let statusText = '';
    let text = '';
    if (auth.agent) {
      const resp = await got(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json;odata=verbose',
          ...headers,
        },
        throwHttpErrors: false,
        responseType: 'text',
        agent: { https: auth.agent, http: auth.agent },
      });
      status = resp.statusCode;
      statusText = resp.statusMessage || '';
      text = resp.body as string;
    } else {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json;odata=verbose',
          ...headers,
        },
      });
      status = res.status;
      statusText = res.statusText;
      text = await res.text();
    }
    console.log('[debugSpAuth] status', status, statusText);
    console.log('[debugSpAuth] body snippet', text.substring(0, 200));
  } catch (error) {
    console.error('[debugSpAuth] error', error);
    process.exitCode = 1;
  }
}

main();
