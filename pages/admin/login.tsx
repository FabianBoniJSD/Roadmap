import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { resolveSharePointSiteUrl } from '@/utils/sharepointEnv';
import Link from 'next/link';

const AdminLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [diag, setDiag] = useState<Record<string, unknown> | null>(null);
  const router = useRouter();
  
  const dbg = (): boolean => {
    if (typeof window === 'undefined') return false;
    const hasFlag = Boolean(window.localStorage && localStorage.getItem('debugAuth'));
    const queryMatch = /([?&])debug=auth(?![\w-])/i.test(window.location.search);
    return hasFlag || queryMatch;
  };

  // Check if already logged in
  useEffect(() => {
    const checkExistingAuth = async () => {
      const token = localStorage.getItem('sp_auth_token');
      if (token) {
        try {
          const response = await fetch('/api/auth/check-admin', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.isAdmin) {
              router.push('/admin');
            }
          }
        } catch (err) {
          // Token invalid, continue to login form
          localStorage.removeItem('sp_auth_token');
        }
      }
    };
    checkExistingAuth();
  }, [router]);

  // Admin access controlled via SharePoint group membership (roadadmin, ID: 22)
  // Domain users authenticate with their Windows credentials

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (dbg()) console.log('[admin/login] Attempting login with username:', username);

      // Call login API with domain credentials
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          domain: 'bs' // Your domain
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      
      if (dbg()) console.log('[admin/login] Login successful, checking admin status');

      // Store auth token
      localStorage.setItem('sp_auth_token', data.token);

      // Check if user is admin
      if (data.isAdmin) {
        if (dbg()) console.log('[admin/login] User is admin, redirecting to /admin');
        localStorage.setItem('isAdmin', 'true');
        router.push('/admin');
      } else {
        setError('You do not have administrator privileges. Please contact your SharePoint administrator to be added to the "roadadmin" group.');
        localStorage.removeItem('sp_auth_token');
        setLoading(false);
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      if (dbg()) console.log('[admin/login] Login exception:', err);
      setError(err instanceof Error ? err.message : 'Invalid credentials or connection error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-white">
            Admin Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Sign in with your domain credentials
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-500 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="bs\username or username@bs.ch"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-400">
                Format: <code className="bg-gray-700 px-1 rounded">bs\username</code> or <code className="bg-gray-700 px-1 rounded">username@bs.ch</code>
              </p>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-500 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Your domain password"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-900 border border-red-700 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          {/* Info box */}
          <div className="mt-4 p-4 bg-blue-900 border border-blue-700 rounded-md">
            <h3 className="text-sm font-semibold text-blue-200 mb-2">
              ℹ️ Admin-Zugriff
            </h3>
            <p className="text-xs text-blue-100 mb-2">
              Admin-Berechtigungen werden über die SharePoint-Gruppe <strong>&quot;roadadmin&quot;</strong> (ID: 22) gesteuert.
            </p>
            <p className="text-xs text-blue-100">
              Ihre Domain-Credentials werden gegen SharePoint authentifiziert. 
              Nach erfolgreicher Anmeldung wird Ihre Gruppenmitgliedschaft geprüft.
            </p>
          </div>

          {dbg() && diag && (
            <div className="mt-4 text-xs text-gray-200 bg-gray-700 rounded p-3 overflow-auto max-h-96">
              <div className="font-semibold mb-1">Debug (auth)</div>
              <pre className="whitespace-pre-wrap break-words">{JSON.stringify(diag, null, 2)}</pre>
            </div>
          )}
        </form>

        <div className="mt-6">
          <Link
            href="/"
            className="w-full flex justify-center py-2 px-4 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            ← Return to Roadmap
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;