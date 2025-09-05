// Simple Forms Based Authentication (FBA) helper for SharePoint on-prem.
// Performs: GET login page -> parse hidden fields -> POST credentials -> capture FedAuth/rtFa cookies.
// Assumptions: FBA provider enabled on the target zone, classic login page at /_layouts/15/Authenticate.aspx.
// This is a lightweight implementation (no full DOM parser) – regex extraction of hidden inputs.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;

interface FbaResult { cookie: string; expires: number }

function debug(...args: any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (process.env.SP_PROXY_DEBUG === 'true') {
    // eslint-disable-next-line no-console
    console.debug('[fbaAuth]', ...args);
  }
}

// Extract hidden input fields from login HTML
function extractHiddenFields(html: string): Record<string,string> {
  const fields: Record<string,string> = {};
  const re = /<input[^>]+type=["']hidden["'][^>]*>/gi;
  const attrRe = /([a-zA-Z0-9_:\-]+)=["']([^"']*)["']/g;
  const matches = html.match(re) || [];
  for (const tag of matches) {
    let name = '';
    let value = '';
    let m: RegExpExecArray | null;
    while ((m = attrRe.exec(tag)) !== null) {
      const attr = m[1].toLowerCase();
      if (attr === 'name') name = m[2];
      if (attr === 'value') value = m[2];
    }
    if (name) fields[name] = value;
  }
  return fields;
}

function buildFormBody(fields: Record<string,string>): string {
  return Object.entries(fields)
    .map(([k,v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
    .join('&');
}

export async function fbaLogin(baseUrl: string, username: string, password: string): Promise<FbaResult> {
  const loginPage = process.env.SP_FBA_LOGIN_PATH || '/_layouts/15/Authenticate.aspx';
  const targetUrl = baseUrl.replace(/\/?$/, '/');
  const sourceParam = encodeURIComponent(targetUrl);
  const loginUrl = `${targetUrl.replace(/\/$/, '')}${loginPage}?Source=${sourceParam}`;
  debug('login GET', loginUrl);
  const getResp = await fetch(loginUrl, { method: 'GET' });
  if (!getResp.ok) {
    let bodySnippet = '';
    try { bodySnippet = (await getResp.text()).slice(0,300).replace(/\s+/g,' '); } catch {/* ignore */}
    const wa = getResp.headers.get('www-authenticate');
    debug('login GET failed', { status: getResp.status, www: wa, snippet: bodySnippet });
    throw new Error(`FBA login page status ${getResp.status}${wa ? ' www='+wa : ''}`);
  }
  const html = await getResp.text();
  const hidden = extractHiddenFields(html);
  // SharePoint FBA typical field IDs (may vary by localization). We attempt common patterns.
  // We'll search for UserName / Password / SignIn (login button) names heuristically.
  const fieldNameUser = Object.keys(hidden).find(k => /username$/i.test(k)) || Object.keys(hidden).find(k => /signInControl.*UserName/i.test(k)) || 'ctl00$PlaceHolderMain$signInControl$UserName';
  const fieldNamePass = Object.keys(hidden).find(k => /password$/i.test(k)) || Object.keys(hidden).find(k => /signInControl.*Password/i.test(k)) || 'ctl00$PlaceHolderMain$signInControl$Password';
  const fieldNameBtn  = Object.keys(hidden).find(k => /login|signin|submit/i.test(k)) || 'ctl00$PlaceHolderMain$signInControl$login';

  hidden[fieldNameUser] = username;
  hidden[fieldNamePass] = password;
  hidden[fieldNameBtn] = 'Anmelden'; // value not strictly required, placeholder text

  const body = buildFormBody(hidden);
  debug('posting credentials', { size: body.length, fields: Object.keys(hidden).length });
  const postResp = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': String(Buffer.byteLength(body))
    },
    body
  });
  // Expect redirect or 200 with FedAuth cookie set
  const setCookie = postResp.headers.get('set-cookie') || '';
  if (!/FedAuth=/i.test(setCookie)) {
    const textSample = (await postResp.text()).slice(0, 300).replace(/\s+/g,' ');
    throw new Error('FBA login failed: FedAuth cookie not found. Sample body: ' + textSample);
  }
  // Consolidate FedAuth + rtFa (if present)
  const cookies: string[] = [];
  const cookieParts = setCookie.split(/,(?=[^ ;]+=)/); // split at cookie boundaries
  for (const part of cookieParts) {
    const fed = part.match(/\b(FedAuth|rtFa)=[^;]+/i);
    if (fed) cookies.push(fed[0]);
  }
  if (!cookies.length) throw new Error('FBA login: cookies parsed but none extracted');
  const cookieHeader = cookies.join('; ');
  // Basic TTL (FedAuth usually has longer); set 30m by default
  const expires = Date.now() + 30 * 60 * 1000;
  debug('FBA success', { cookies: cookies.map(c => c.split('=')[0]), ttlMinutes: 30 });
  return { cookie: cookieHeader, expires };
}
