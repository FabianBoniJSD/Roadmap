/**
 * Admin authentication utilities for roadmap application
 * Uses JWT tokens stored in sessionStorage after Windows authentication via SharePoint
 */

// Lightweight debug switch for verbose console logs around auth/admin flows
function debugAuthEnabled(): boolean {
  try {
    if (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true')) return true;
    if (typeof window !== 'undefined') {
      if (/([?&])debug=auth(?![\w-])/i.test(window.location.search)) return true;
      const ls = window.localStorage?.getItem('debugAuth');
      if (ls && ls !== '0' && ls.toLowerCase() !== 'false') return true;
    }
  } catch { /* ignore */ }
  return false;
}

function log(...args: any[]) {
  if (debugAuthEnabled()) {
    // eslint-disable-next-line no-console
    console.log('[admin-auth]', ...args);
  }
}

// Check if the service account has admin access
export async function hasAdminAccess(): Promise<boolean> {
  try {
    log('hasAdminAccess: Checking service account admin rights');
    
    if (typeof window === 'undefined') {
      log('hasAdminAccess: server-side, returning false');
      return false;
    }
    
    // Direct check via service account (no user session needed)
    try {
      const response = await fetch('/api/auth/check-admin');
      if (response.ok) {
        const data = await response.json();
        log(`hasAdminAccess: Service account isAdmin = ${data.isAdmin}`);
        return data.isAdmin;
      } else {
        log('hasAdminAccess: Admin check failed with status', response.status);
        return false;
      }
    } catch (error) {
      log('hasAdminAccess: Error checking admin status:', error);
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
  log('logout: Service account auth - no session to clear');
  // Redirect to home page
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
}

/**
 * Get current admin username (returns service account info)
 */
export function getAdminUsername(): string | null {
  // Return service account identifier
  return 'Service Account';
}