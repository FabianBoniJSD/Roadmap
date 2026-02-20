/**
 * Admin authentication utilities for roadmap application
 * Uses JWT tokens stored in sessionStorage after Windows authentication via SharePoint
 */

const TOKEN_KEY = 'adminToken';
const USERNAME_KEY = 'adminUsername';
const INSTANCE_COOKIE_KEY = 'roadmap-instance';
const ADMIN_TOKEN_COOKIE_KEY = 'roadmap-admin-token';

// Lightweight debug switch for verbose console logs around auth/admin flows
function debugAuthEnabled(): boolean {
  try {
    if (
      typeof process !== 'undefined' &&
      process.env &&
      process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true'
    )
      return true;
    if (typeof window !== 'undefined') {
      if (/([?&])debug=auth(?![\w-])/i.test(window.location.search)) return true;
      const ls = window.localStorage?.getItem('debugAuth');
      if (ls && ls !== '0' && ls.toLowerCase() !== 'false') return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function log(...args: unknown[]) {
  if (debugAuthEnabled()) {
    // eslint-disable-next-line no-console
    console.log('[admin-auth]', ...args);
  }
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function setAdminTokenCookie(token: string) {
  if (typeof document === 'undefined') return;
  try {
    const secure = typeof window !== 'undefined' ? window.location.protocol === 'https:' : false;
    const parts = [
      `${ADMIN_TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}`,
      'Path=/',
      'SameSite=Lax',
    ];
    if (secure) parts.push('Secure');
    document.cookie = parts.join('; ');
  } catch {
    // ignore
  }
}

function clearAdminTokenCookie() {
  if (typeof document === 'undefined') return;
  try {
    const secure = typeof window !== 'undefined' ? window.location.protocol === 'https:' : false;
    const parts = [`${ADMIN_TOKEN_COOKIE_KEY}=`, 'Path=/', 'SameSite=Lax', 'Max-Age=0'];
    if (secure) parts.push('Secure');
    document.cookie = parts.join('; ');
  } catch {
    // ignore
  }
}

function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const cookies = document.cookie.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.toLowerCase().startsWith(`${ADMIN_TOKEN_COOKIE_KEY}=`)) {
        return decodeURIComponent(cookie.substring(ADMIN_TOKEN_COOKIE_KEY.length + 1)).trim();
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function getStoredToken(): string | null {
  const storage = getSessionStorage();
  if (!storage) return getTokenFromCookie();
  try {
    return storage.getItem(TOKEN_KEY) || getTokenFromCookie();
  } catch {
    return getTokenFromCookie();
  }
}

function clearStoredSession() {
  const storage = getSessionStorage();
  if (storage) {
    try {
      storage.removeItem(TOKEN_KEY);
      storage.removeItem(USERNAME_KEY);
    } catch {
      // ignore
    }
  }
  clearAdminTokenCookie();
}

function setStoredSession(token: string, username: string) {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.setItem(TOKEN_KEY, token);
    storage.setItem(USERNAME_KEY, username);
  } catch (error) {
    log('setStoredSession failed', error);
  }
}

export function persistAdminSession(token: string, username: string) {
  setStoredSession(token, username);
  setAdminTokenCookie(token);
}

function getBrowserInstanceSlug(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('roadmapInstance');
    if (fromQuery) return fromQuery.trim().toLowerCase();
    const cookies = document.cookie.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.toLowerCase().startsWith(`${INSTANCE_COOKIE_KEY}=`)) {
        return decodeURIComponent(cookie.substring(INSTANCE_COOKIE_KEY.length + 1)).trim();
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function getCurrentBrowserInstanceSlug(): string | null {
  return getBrowserInstanceSlug();
}

/**
 * For JWT-based admin sessions (USER_* logins), enforce per-instance allowlists.
 * Returns false only for explicit 403 (Forbidden). Other failures are treated as "don't block".
 */
export async function hasAdminAccessToCurrentInstance(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return true;

    const token = getStoredToken();
    if (!token) return true;

    const slug = getBrowserInstanceSlug();
    if (!slug) return true;

    const resp = await fetch(`/api/instances/${encodeURIComponent(slug)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (resp.status === 403) return false;
    return true;
  } catch {
    return true;
  }
}

export function buildInstanceAwareUrl(path: string): string {
  // When Next.js basePath is configured (reverse proxy subdir), API routes live under it.
  const basePath = (() => {
    try {
      const deploymentEnv =
        process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || process.env.NODE_ENV || 'development';
      const rawBasePath =
        deploymentEnv === 'production'
          ? process.env.NEXT_PUBLIC_BASE_PATH_PROD || ''
          : process.env.NEXT_PUBLIC_BASE_PATH_DEV || '';
      const trimmed = String(rawBasePath || '').trim();
      if (!trimmed || trimmed === '/') return '';
      const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      return withLeading.replace(/\/+$/, '');
    } catch {
      return '';
    }
  })();

  const shouldPrefixBasePath = path.startsWith('/api/');
  const withBasePath =
    shouldPrefixBasePath &&
    basePath &&
    path.startsWith('/') &&
    !path.startsWith(basePath + '/') &&
    path !== basePath
      ? `${basePath}${path}`
      : path;

  const slug = getBrowserInstanceSlug();
  if (!slug) return withBasePath;
  const hasQuery = withBasePath.includes('?');
  const separator = hasQuery ? '&' : '?';
  return `${withBasePath}${separator}roadmapInstance=${encodeURIComponent(slug)}`;
}

export function getAdminSessionToken(): string | null {
  return getStoredToken();
}

/**
 * Strict session check: returns true ONLY when a JWT admin session token exists and is valid.
 * Does not fall back to the SharePoint service-account permission check.
 */
export async function hasValidAdminSession(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false;

    const token = getStoredToken();
    if (!token) return false;

    const response = await fetch(buildInstanceAwareUrl('/api/auth/check-admin-session'), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      clearStoredSession();
      return false;
    }

    const data = (await response.json().catch(() => null)) as null | { isAdmin?: unknown };
    const ok = Boolean(data && typeof data.isAdmin === 'boolean' ? data.isAdmin : false);
    if (!ok) clearStoredSession();
    return ok;
  } catch {
    return false;
  }
}

// Check if the current browser session has admin access
export async function hasAdminAccess(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') {
      return false;
    }

    const token = getStoredToken();
    if (token) {
      log('hasAdminAccess: verifying stored admin session');
      try {
        const response = await fetch(buildInstanceAwareUrl('/api/auth/check-admin-session'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.isAdmin) {
            log('hasAdminAccess: session valid');
            return true;
          }
        }
        log('hasAdminAccess: stored session invalid, clearing');
        clearStoredSession();
      } catch (error) {
        log('hasAdminAccess: error verifying token', error);
      }
    }

    log('hasAdminAccess: falling back to service account metadata');
    try {
      const response = await fetch(buildInstanceAwareUrl('/api/auth/check-admin'));
      if (response.ok) {
        const data = await response.json();
        if (data.requiresUserSession) {
          log('hasAdminAccess: environment requires user session, no auto access');
          return false;
        }
        log(`hasAdminAccess: service account fallback -> ${data.isAdmin}`);
        return Boolean(data.isAdmin);
      } else {
        log('hasAdminAccess: fallback check failed with status', response.status);
        return false;
      }
    } catch (error) {
      log('hasAdminAccess: error checking fallback admin status', error);
      return false;
    }
  } catch (error) {
    console.error('Admin check failed:', error);
    return false;
  }
}

/**
 * Logout (no-op for service account based auth)
 * Kept for backwards compatibility
 */
export function logout(): void {
  if (typeof window !== 'undefined') {
    log('logout: clearing stored session');
    clearStoredSession();
    window.location.href = '/admin/login';
  }
}

/**
 * Get current admin username (returns service account info)
 */
export function getAdminUsername(): string | null {
  const storage = getSessionStorage();
  if (!storage) return null;
  try {
    return storage.getItem(USERNAME_KEY);
  } catch {
    return null;
  }
}
