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

  const returnUrlRaw =
    typeof req.query.returnUrl === 'string' && req.query.returnUrl.trim()
      ? req.query.returnUrl.trim()
      : '/admin';
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
