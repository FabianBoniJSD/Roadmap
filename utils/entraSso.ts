import type { NextApiRequest } from 'next';
import crypto from 'crypto';

export type EntraUserProfile = {
  id?: string;
  displayName?: string;
  userPrincipalName?: string;
  mail?: string;
};

function base64UrlEncode(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function sha256Base64Url(input: string): string {
  const hash = crypto.createHash('sha256').update(input).digest();
  return base64UrlEncode(hash);
}

export function resolveNextBasePath(): string {
  const deploymentEnv =
    process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || process.env.NODE_ENV || 'development';
  const rawBasePath =
    deploymentEnv === 'production'
      ? process.env.NEXT_PUBLIC_BASE_PATH_PROD || ''
      : process.env.NEXT_PUBLIC_BASE_PATH_DEV || '';
  return (rawBasePath || '').replace(/\/$/, '');
}

export function getRequestOrigin(req: NextApiRequest): string {
  const proto = String(req.headers['x-forwarded-proto'] || 'http');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost');
  return `${proto}://${host}`;
}

export function getEntraRedirectUri(req: NextApiRequest): string {
  if (process.env.ENTRA_REDIRECT_URI && process.env.ENTRA_REDIRECT_URI.trim()) {
    return process.env.ENTRA_REDIRECT_URI.trim();
  }
  const origin = getRequestOrigin(req);
  const basePath = resolveNextBasePath();
  return `${origin}${basePath}/api/auth/entra/callback`;
}

export function entraSsoEnabled(): boolean {
  return Boolean(
    process.env.ENTRA_TENANT_ID && process.env.ENTRA_CLIENT_ID && process.env.ENTRA_CLIENT_SECRET
  );
}

export function generateRandomBase64Url(bytes = 32): string {
  return base64UrlEncode(crypto.randomBytes(bytes));
}

export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = generateRandomBase64Url(48);
  const challenge = sha256Base64Url(verifier);
  return { verifier, challenge };
}

export function getEntraAuthority(tenantId: string): string {
  return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0`;
}

export function buildEntraAuthorizeUrl(args: {
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
}): Promise<{ idToken?: string; accessToken?: string; raw: unknown }> {
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

export async function fetchGraphMe(accessToken: string): Promise<EntraUserProfile> {
  const resp = await fetch(
    'https://graph.microsoft.com/v1.0/me?$select=id,displayName,userPrincipalName,mail',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const raw = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const message =
      typeof raw?.error?.message === 'string' ? raw.error.message : 'Graph /me failed';
    throw new Error(message);
  }
  return raw as EntraUserProfile;
}

export function isEntraUserAllowed(profile: EntraUserProfile): boolean {
  const allowAll = String(process.env.ENTRA_ALLOW_ALL || '').toLowerCase() === 'true';
  if (allowAll) return true;

  const allowedUpnsRaw = String(process.env.ENTRA_ADMIN_UPNS || '').trim();
  if (!allowedUpnsRaw) return false;

  const candidates = [profile.userPrincipalName, profile.mail]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim().toLowerCase());

  const allowed = allowedUpnsRaw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return candidates.some((c) => allowed.includes(c));
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  const parts = header.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(value);
  }
  return out;
}

export function buildSetCookie(
  name: string,
  value: string,
  opts: {
    maxAgeSeconds?: number;
    httpOnly?: boolean;
    sameSite?: 'Lax' | 'Strict' | 'None';
    secure?: boolean;
    path?: string;
  } = {}
): string {
  const segments: string[] = [];
  segments.push(`${name}=${encodeURIComponent(value)}`);
  segments.push(`Path=${opts.path || '/'}`);
  if (typeof opts.maxAgeSeconds === 'number') segments.push(`Max-Age=${opts.maxAgeSeconds}`);
  if (opts.httpOnly) segments.push('HttpOnly');
  if (opts.secure) segments.push('Secure');
  segments.push(`SameSite=${opts.sameSite || 'Lax'}`);
  return segments.join('; ');
}

export function shouldUseSecureCookies(req: NextApiRequest): boolean {
  const proto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  if (proto === 'https') return true;
  return process.env.NODE_ENV === 'production';
}
