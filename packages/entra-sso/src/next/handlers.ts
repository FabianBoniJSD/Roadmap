import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  fetchGraphMe,
  generatePkcePair,
  generateRandomBase64Url,
  type EntraUserProfile,
} from '../core';
import { buildSetCookie, parseCookies, shouldUseSecureCookies } from './cookies';
import { getEntraRedirectUri, type EntraRedirectEnv } from './redirectUri';

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderPopupResultHtml(args: {
  ok: boolean;
  token?: string;
  username?: string;
  error?: string;
  origin: string;
}) {
  const payload = args.ok
    ? `({ type: 'AUTH_SUCCESS', token: '${escapeHtml(args.token || '')}', username: '${escapeHtml(
        args.username || ''
      )}' })`
    : `({ type: 'AUTH_ERROR', error: '${escapeHtml(args.error || 'SSO fehlgeschlagen')}' })`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SSO</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
  <p>${args.ok ? 'Anmeldung erfolgreich. Fenster wird geschlossen …' : 'Anmeldung fehlgeschlagen. Fenster wird geschlossen …'}</p>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage(${payload}, '${escapeHtml(args.origin)}');
      }
    } catch (e) {
      // ignore
    }
    setTimeout(() => window.close(), 600);
  </script>
</body>
</html>`;
}

export type EntraNextCookieNames = {
  state: string;
  nonce: string;
  verifier: string;
  returnUrl: string;
  popup: string;
};

export function defaultCookieNames(prefix = 'entra_'): EntraNextCookieNames {
  return {
    state: `${prefix}state`,
    nonce: `${prefix}nonce`,
    verifier: `${prefix}pkce_verifier`,
    returnUrl: `${prefix}return_url`,
    popup: `${prefix}popup`,
  };
}

export function createEntraLoginHandler(config: {
  tenantId: string;
  clientId: string;
  env: EntraRedirectEnv;
  cookiePrefix?: string;
  scopes?: string[];
  prompt?: string;
  callbackPath?: string;
  defaultReturnUrl?: string;
}): (req: NextApiRequest, res: NextApiResponse) => void {
  const cookies = defaultCookieNames(config.cookiePrefix);

  return (req, res) => {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const redirectUri = getEntraRedirectUri({
      req,
      env: config.env,
      callbackPath: config.callbackPath,
    });
    if (!redirectUri || !/^https?:\/\//i.test(redirectUri)) {
      res.status(500).json({
        error:
          'Invalid redirect URI. Set ENTRA_REDIRECT_URI explicitly (must be an absolute http/https URL).',
        computedRedirectUri: redirectUri,
      });
      return;
    }

    const returnUrlRaw =
      typeof req.query.returnUrl === 'string' && req.query.returnUrl.trim()
        ? req.query.returnUrl.trim()
        : config.defaultReturnUrl || '/admin';
    const popup = String(req.query.popup || '') === '1';

    const state = generateRandomBase64Url(32);
    const nonce = generateRandomBase64Url(32);
    const { verifier, challenge } = generatePkcePair();

    const scopes = config.scopes || ['openid', 'profile', 'email', 'User.Read'];

    const authorizeUrl = buildAuthorizeUrl({
      tenantId: config.tenantId,
      clientId: config.clientId,
      redirectUri,
      state,
      nonce,
      codeChallenge: challenge,
      scopes,
      prompt: config.prompt || 'select_account',
    });

    const secure = shouldUseSecureCookies(req);
    const common = { maxAgeSeconds: 10 * 60, httpOnly: true, sameSite: 'Lax' as const, secure };

    res.setHeader('Set-Cookie', [
      buildSetCookie(cookies.state, state, common),
      buildSetCookie(cookies.nonce, nonce, common),
      buildSetCookie(cookies.verifier, verifier, common),
      buildSetCookie(cookies.returnUrl, returnUrlRaw, { ...common, httpOnly: false }),
      buildSetCookie(cookies.popup, popup ? '1' : '0', { ...common, httpOnly: false }),
    ]);

    res.redirect(302, authorizeUrl);
  };
}

export function createEntraCallbackHandler(config: {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  env: EntraRedirectEnv;
  cookiePrefix?: string;
  callbackPath?: string;
  resolveUser?: (accessToken: string) => Promise<EntraUserProfile>;
  isAllowed: (profile: EntraUserProfile) => boolean;
  issueAppToken: (profile: EntraUserProfile) => { token: string; username: string };
  onErrorRedirect?: (args: { returnUrl: string; error: string }) => string;
}): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  const cookies = defaultCookieNames(config.cookiePrefix);

  return async (req, res) => {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const cookieValues = parseCookies(req.headers.cookie);
    const secure = shouldUseSecureCookies(req);

    const origin = `${String(req.headers['x-forwarded-proto'] || 'http')}://${String(
      req.headers['x-forwarded-host'] || req.headers.host || 'localhost'
    )}`;

    const clearCookies = [
      buildSetCookie(cookies.state, '', {
        maxAgeSeconds: 0,
        httpOnly: true,
        sameSite: 'Lax',
        secure,
      }),
      buildSetCookie(cookies.nonce, '', {
        maxAgeSeconds: 0,
        httpOnly: true,
        sameSite: 'Lax',
        secure,
      }),
      buildSetCookie(cookies.verifier, '', {
        maxAgeSeconds: 0,
        httpOnly: true,
        sameSite: 'Lax',
        secure,
      }),
      buildSetCookie(cookies.returnUrl, '', {
        maxAgeSeconds: 0,
        httpOnly: false,
        sameSite: 'Lax',
        secure,
      }),
      buildSetCookie(cookies.popup, '', {
        maxAgeSeconds: 0,
        httpOnly: false,
        sameSite: 'Lax',
        secure,
      }),
    ];

    const popup = cookieValues[cookies.popup] === '1';
    const returnUrl = cookieValues[cookies.returnUrl] || '/admin';

    const error = typeof req.query.error === 'string' ? req.query.error : '';
    const errorDesc =
      typeof req.query.error_description === 'string' ? req.query.error_description : '';
    if (error) {
      res.setHeader('Set-Cookie', clearCookies);
      const msg = errorDesc || error;
      if (popup) {
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(renderPopupResultHtml({ ok: false, error: msg, origin }));
        return;
      }
      const target = config.onErrorRedirect
        ? config.onErrorRedirect({ returnUrl, error: msg })
        : `/admin/login?returnUrl=${encodeURIComponent(returnUrl)}&error=${encodeURIComponent(msg)}`;
      res.redirect(302, target);
      return;
    }

    const code = typeof req.query.code === 'string' ? req.query.code : null;
    const state = typeof req.query.state === 'string' ? req.query.state : null;

    const expectedState = cookieValues[cookies.state] || null;
    const verifier = cookieValues[cookies.verifier] || null;

    if (!code || !state || !expectedState || state !== expectedState || !verifier) {
      res.setHeader('Set-Cookie', clearCookies);
      const msg = 'Ungültiger Login-Callback (state/code)';
      if (popup) {
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(renderPopupResultHtml({ ok: false, error: msg, origin }));
        return;
      }
      res.redirect(
        302,
        `/admin/login?returnUrl=${encodeURIComponent(returnUrl)}&error=${encodeURIComponent(msg)}`
      );
      return;
    }

    try {
      const redirectUri = getEntraRedirectUri({
        req,
        env: config.env,
        callbackPath: config.callbackPath,
      });

      const tokens = await exchangeCodeForTokens({
        tenantId: config.tenantId,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri,
        code,
        codeVerifier: verifier,
      });

      if (!tokens.accessToken) {
        throw new Error('Kein access_token erhalten (prüfe Scope User.Read)');
      }

      const resolveUser = config.resolveUser || fetchGraphMe;
      const me = await resolveUser(tokens.accessToken);

      if (!config.isAllowed(me)) {
        throw new Error('Nicht berechtigt');
      }

      const issued = config.issueAppToken(me);

      res.setHeader('Set-Cookie', clearCookies);

      if (popup) {
        res.setHeader('Content-Type', 'text/html');
        res
          .status(200)
          .send(
            renderPopupResultHtml({
              ok: true,
              token: issued.token,
              username: issued.username,
              origin,
            })
          );
        return;
      }

      const target = `${returnUrl}#token=${encodeURIComponent(issued.token)}&username=${encodeURIComponent(
        issued.username
      )}`;
      res.redirect(302, target);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'SSO fehlgeschlagen';
      res.setHeader('Set-Cookie', clearCookies);
      if (popup) {
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(renderPopupResultHtml({ ok: false, error: msg, origin }));
        return;
      }
      res.redirect(
        302,
        `/admin/login?returnUrl=${encodeURIComponent(returnUrl)}&error=${encodeURIComponent(msg)}`
      );
    }
  };
}
