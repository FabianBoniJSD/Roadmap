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

// Check if the user has admin access
export async function hasAdminAccess(): Promise<boolean> {
  try {
    log('hasAdminAccess: start');
    
    if (typeof window === 'undefined') {
      log('hasAdminAccess: server-side, returning false');
      return false;
    }
    
    // Check if user has a valid JWT token
    const storedToken = sessionStorage.getItem('adminToken');
    if (storedToken) {
      log('hasAdminAccess: User has stored token, verifying session...');
      try {
        const response = await fetch('/api/auth/check-admin-session', {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          log(`hasAdminAccess: Token valid, isAdmin = ${data.isAdmin}`);
          return data.isAdmin;
        } else {
          // Token expired or invalid, clear it
          log('hasAdminAccess: Token invalid, clearing session');
          sessionStorage.removeItem('adminToken');
          sessionStorage.removeItem('adminUsername');
        }
      } catch (error) {
        log('hasAdminAccess: Error checking session:', error);
      }
    }
    
    // No valid session, user needs to log in
    log('hasAdminAccess: No valid session found');
    return false;
  } catch (error) {
    console.error('Admin check failed:', error);
    return false;
  }
}

/**
 * Logout and clear admin session
 */
export function logout(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminUsername');
    log('logout: Session cleared');
  }
}

/**
 * Get current admin username from session
 */
export function getAdminUsername(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('adminUsername');
  }
  return null;
}