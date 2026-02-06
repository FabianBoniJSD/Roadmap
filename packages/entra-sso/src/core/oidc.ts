export type TokenExchangeResult = {
  idToken?: string;
  accessToken?: string;
  raw: unknown;
};

export function getEntraAuthority(tenantId: string): string {
  return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0`;
}

export function buildAuthorizeUrl(args: {
  tenantId: string;
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  scopes: string[];
  prompt?: string;
}): string {
  const authority = getEntraAuthority(args.tenantId);
  const url = new URL(`${authority}/authorize`);

  url.searchParams.set('client_id', args.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', args.redirectUri);
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('scope', args.scopes.join(' '));
  url.searchParams.set('state', args.state);
  url.searchParams.set('nonce', args.nonce);
  url.searchParams.set('code_challenge', args.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  if (args.prompt) url.searchParams.set('prompt', args.prompt);

  return url.toString();
}

export async function exchangeCodeForTokens(args: {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
}): Promise<TokenExchangeResult> {
  const authority = getEntraAuthority(args.tenantId);

  const body = new URLSearchParams();
  body.set('client_id', args.clientId);
  body.set('client_secret', args.clientSecret);
  body.set('grant_type', 'authorization_code');
  body.set('code', args.code);
  body.set('redirect_uri', args.redirectUri);
  body.set('code_verifier', args.codeVerifier);

  const resp = await fetch(`${authority}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const raw: unknown = await resp.json().catch(() => ({}));
  const rawObj = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;

  if (!resp.ok) {
    const message =
      typeof rawObj.error_description === 'string'
        ? rawObj.error_description
        : typeof rawObj.error === 'string'
          ? rawObj.error
          : `Token exchange failed (${resp.status})`;
    throw new Error(message);
  }

  return {
    idToken: typeof rawObj.id_token === 'string' ? rawObj.id_token : undefined,
    accessToken: typeof rawObj.access_token === 'string' ? rawObj.access_token : undefined,
    raw,
  };
}
