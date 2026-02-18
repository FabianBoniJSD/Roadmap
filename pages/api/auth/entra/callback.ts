import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import {
  exchangeCodeForTokens,
  fetchGraphMe,
  fetchGraphMyGroupDisplayNames,
  isUserAllowedByUpnAllowlist,
} from '@roadmap/entra-sso/core';
import {
  buildSetCookie,
  getEntraRedirectUri,
  parseCookies,
  shouldUseSecureCookies,
  type EntraRedirectEnv,
} from '@roadmap/entra-sso/next';

function entraSsoEnabled(): boolean {
  return Boolean(
    process.env.ENTRA_TENANT_ID && process.env.ENTRA_CLIENT_ID && process.env.ENTRA_CLIENT_SECRET
  );
}

const JWT_SECRET = process.env.JWT_SECRET || 'roadmap-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

const COOKIE_STATE = 'entra_state';
const COOKIE_VERIFIER = 'entra_pkce_verifier';
const COOKIE_RETURN_URL = 'entra_return_url';
const COOKIE_POPUP = 'entra_popup';

function normalizeReturnUrl(input: string | undefined | null, fallback = '/admin'): string {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//')) return fallback;
  const [pathOnly] = raw.split('?', 1);
  return pathOnly || fallback;
}

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
        window.opener.postMessage(${payload}, window.location.origin);
      }
    } catch (e) {
      // ignore
    }
    setTimeout(() => window.close(), 600);
  </script>
</body>
</html>`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!entraSsoEnabled()) {
    return res.status(400).send('Entra SSO is not configured');
  }

  const cookies = parseCookies(req.headers.cookie);
  const secure = shouldUseSecureCookies(req);

  const clearCookies = [
    buildSetCookie(COOKIE_STATE, '', { maxAgeSeconds: 0, httpOnly: true, sameSite: 'Lax', secure }),
    buildSetCookie(COOKIE_VERIFIER, '', {
      maxAgeSeconds: 0,
      httpOnly: true,
      sameSite: 'Lax',
      secure,
    }),
    buildSetCookie(COOKIE_RETURN_URL, '', {
      maxAgeSeconds: 0,
      httpOnly: false,
      sameSite: 'Lax',
      secure,
    }),
    buildSetCookie(COOKIE_POPUP, '', {
      maxAgeSeconds: 0,
      httpOnly: false,
      sameSite: 'Lax',
      secure,
    }),
  ];

  const popup = cookies[COOKIE_POPUP] === '1';
  const returnUrl = normalizeReturnUrl(cookies[COOKIE_RETURN_URL], '/admin');

  const error = typeof req.query.error === 'string' ? req.query.error : '';
  const errorDesc =
    typeof req.query.error_description === 'string' ? req.query.error_description : '';
  if (error) {
    res.setHeader('Set-Cookie', clearCookies);
    if (popup) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(renderPopupResultHtml({ ok: false, error: errorDesc || error }));
    }
    const target = `/admin/login?returnUrl=${encodeURIComponent(returnUrl)}&error=${encodeURIComponent(
      errorDesc || error
    )}`;
    return res.redirect(302, target);
  }

  const code = typeof req.query.code === 'string' ? req.query.code : null;
  const state = typeof req.query.state === 'string' ? req.query.state : null;

  const expectedState = cookies[COOKIE_STATE] || null;
  const verifier = cookies[COOKIE_VERIFIER] || null;

  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    res.setHeader('Set-Cookie', clearCookies);
    const msg = 'Ungültiger Login-Callback (state/code)';
    if (popup) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(renderPopupResultHtml({ ok: false, error: msg }));
    }
    return res.redirect(
      302,
      `/admin/login?returnUrl=${encodeURIComponent(returnUrl)}&error=${encodeURIComponent(msg)}`
    );
  }

  try {
    const tenantId = String(process.env.ENTRA_TENANT_ID);
    const clientId = String(process.env.ENTRA_CLIENT_ID);
    const clientSecret = String(process.env.ENTRA_CLIENT_SECRET);

    const redirectUri = getEntraRedirectUri({ req, env: process.env as EntraRedirectEnv });

    const tokens = await exchangeCodeForTokens({
      tenantId,
      clientId,
      clientSecret,
      redirectUri,
      code,
      codeVerifier: verifier,
    });

    if (!tokens.accessToken) {
      throw new Error('Kein access_token erhalten (prüfe Scope User.Read)');
    }

    const me = await fetchGraphMe(tokens.accessToken);

    let groupNames: string[] = [];
    try {
      groupNames = await fetchGraphMyGroupDisplayNames(tokens.accessToken);
    } catch (e: unknown) {
      // Not fatal: many tenants don't grant GroupMember.Read.All.
      const msg = e instanceof Error ? e.message : 'unknown';
      // eslint-disable-next-line no-console
      console.warn('[entra] group fetch skipped/failed:', msg);
      groupNames = [];
    }

    const allowAll = String(process.env.ENTRA_ALLOW_ALL || '').toLowerCase() === 'true';
    const allowed = isUserAllowedByUpnAllowlist({
      profile: me,
      allowAll,
      allowedUpnsCsv: process.env.ENTRA_ADMIN_UPNS,
    });

    if (!allowed) {
      throw new Error(
        'Nicht berechtigt. Setze ENTRA_ADMIN_UPNS (oder ENTRA_ALLOW_ALL=true) für Admin-Zugriff.'
      );
    }

    const username = me.userPrincipalName || me.mail || 'unknown';
    const displayName = me.displayName || username;

    const appToken = jwt.sign(
      {
        username,
        displayName,
        isAdmin: true,
        source: 'entra',
        groups: groupNames,
        entra: { id: me.id, upn: me.userPrincipalName, mail: me.mail },
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.setHeader('Set-Cookie', clearCookies);

    if (popup) {
      res.setHeader('Content-Type', 'text/html');
      return res
        .status(200)
        .send(renderPopupResultHtml({ ok: true, token: appToken, username: displayName }));
    }

    // Non-popup: send token in fragment so it doesn't hit server logs.
    const target = `${returnUrl}#token=${encodeURIComponent(appToken)}&username=${encodeURIComponent(displayName)}`;
    return res.redirect(302, target);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'SSO fehlgeschlagen';
    res.setHeader('Set-Cookie', clearCookies);
    if (popup) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(renderPopupResultHtml({ ok: false, error: msg }));
    }
    return res.redirect(
      302,
      `/admin/login?returnUrl=${encodeURIComponent(returnUrl)}&error=${encodeURIComponent(msg)}`
    );
  }
}
