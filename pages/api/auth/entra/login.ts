import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildAuthorizeUrl,
  generatePkcePair,
  generateRandomBase64Url,
} from '@roadmap/entra-sso/core';
import {
  buildSetCookie,
  getEntraRedirectUri,
  shouldUseSecureCookies,
  type EntraRedirectEnv,
} from '@roadmap/entra-sso/next';

function entraSsoEnabled(): boolean {
  return Boolean(
    process.env.ENTRA_TENANT_ID && process.env.ENTRA_CLIENT_ID && process.env.ENTRA_CLIENT_SECRET
  );
}

function normalizeReturnUrl(input: string | undefined | null, fallback = '/admin'): string {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//')) return fallback;

  // Defensive: if a misconfigured Entra redirect sent code/state to an app page,
  // the returnUrl may contain huge OIDC query params. Drop them.
  const [pathOnly] = raw.split('?', 1);
  return pathOnly || fallback;
}

function isRedirectUriLikelyMisconfigured(envRedirectUri: string): boolean {
  try {
    const u = new URL(envRedirectUri);
    // We expect the callback route, not an app page like /admin.
    return !u.pathname.includes('/api/auth/entra/callback');
  } catch {
    return true;
  }
}

const COOKIE_STATE = 'entra_state';
const COOKIE_NONCE = 'entra_nonce';
const COOKIE_VERIFIER = 'entra_pkce_verifier';
const COOKIE_RETURN_URL = 'entra_return_url';
const COOKIE_POPUP = 'entra_popup';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!entraSsoEnabled()) {
    return res.status(400).json({ error: 'Entra SSO is not configured' });
  }

  const tenantId = String(process.env.ENTRA_TENANT_ID);
  const clientId = String(process.env.ENTRA_CLIENT_ID);

  const redirectUri = getEntraRedirectUri({ req, env: process.env as EntraRedirectEnv });
  if (!redirectUri || !/^https?:\/\//i.test(redirectUri)) {
    return res.status(500).json({
      error:
        'Invalid redirect URI. Set ENTRA_REDIRECT_URI explicitly (must be an absolute http/https URL).',
      computedRedirectUri: redirectUri,
    });
  }

  const envRedirectUri = String(process.env.ENTRA_REDIRECT_URI || '').trim();
  if (envRedirectUri && isRedirectUriLikelyMisconfigured(envRedirectUri)) {
    // Compute the expected callback URL (ignore the override).
    const envWithoutOverride = {
      ...(process.env as EntraRedirectEnv),
      ENTRA_REDIRECT_URI: undefined,
    };
    const expected = getEntraRedirectUri({ req, env: envWithoutOverride });

    const returnUrl = normalizeReturnUrl(
      typeof req.query.returnUrl === 'string' ? req.query.returnUrl : null,
      '/admin'
    );

    const msg =
      `ENTRA_REDIRECT_URI is misconfigured. ` +
      `It must point to the callback route (/api/auth/entra/callback), not "${envRedirectUri}". ` +
      `Fix .env and Entra App Registration redirect URI to: ${expected}`;

    return res.redirect(
      302,
      `/admin/login?manual=1&returnUrl=${encodeURIComponent(returnUrl)}&error=${encodeURIComponent(msg)}`
    );
  }

  const returnUrlRaw = normalizeReturnUrl(
    typeof req.query.returnUrl === 'string' ? req.query.returnUrl : null,
    '/admin'
  );
  const popup = String(req.query.popup || '') === '1';

  const state = generateRandomBase64Url(32);
  const nonce = generateRandomBase64Url(32);
  const { verifier, challenge } = generatePkcePair();

  const scopes = [
    'openid',
    'profile',
    'email',
    // Using Graph to resolve the signed-in user profile (no extra deps).
    // Requires delegated permission: User.Read
    'User.Read',
  ];

  const authorizeUrl = buildAuthorizeUrl({
    tenantId,
    clientId,
    redirectUri,
    state,
    nonce,
    codeChallenge: challenge,
    scopes,
    prompt: 'select_account',
  });

  const secure = shouldUseSecureCookies(req);
  const common = { maxAgeSeconds: 10 * 60, httpOnly: true, sameSite: 'Lax' as const, secure };

  res.setHeader('Set-Cookie', [
    buildSetCookie(COOKIE_STATE, state, common),
    buildSetCookie(COOKIE_NONCE, nonce, common),
    buildSetCookie(COOKIE_VERIFIER, verifier, common),
    buildSetCookie(COOKIE_RETURN_URL, returnUrlRaw, { ...common, httpOnly: false }),
    buildSetCookie(COOKIE_POPUP, popup ? '1' : '0', { ...common, httpOnly: false }),
  ]);

  res.redirect(302, authorizeUrl);
}
