import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { isAuthenticated, hasAdminAccess, redirectToLogin } from '@/utils/auth';
import { resolveSharePointSiteUrl } from '@/utils/sharepointEnv';
import Link from 'next/link';

const AdminLogin: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [diag, setDiag] = useState<Record<string, unknown> | null>(null);
  const router = useRouter();
  const dbg = (): boolean => {
    if (typeof window === 'undefined') return false;
    const hasFlag = Boolean(window.localStorage && localStorage.getItem('debugAuth'));
    const queryMatch = /([?&])debug=auth(?![\w-])/i.test(window.location.search);
    return hasFlag || queryMatch;
  };

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        const out: Record<string, unknown> = { now: new Date().toISOString() };
        const webUrl = '/api/sharepoint';
        out.webUrl = webUrl;
        try {
          const r = await fetch(`${webUrl}/_api/web/currentuser`, { headers: { Accept: 'application/json;odata=nometadata' }, credentials: 'include' });
          out.proxy = { ok: r.ok, status: r.status, ct: r.headers.get('content-type') };
          if (!r.ok) out.proxyBody = (await r.text()).slice(0,200);
        } catch (e: unknown) { out.proxyError = e instanceof Error ? e.message : String(e); }
        try {
          const directUrl = resolveSharePointSiteUrl().replace(/\/$/, '') + '/_api/web/currentuser';
          out.directUrl = directUrl;
          const r2 = await fetch(directUrl, { headers: { Accept: 'application/json;odata=nometadata' }, credentials: 'include' } as RequestInit);
          out.direct = { ok: r2.ok, status: r2.status };
        } catch (e2: unknown) { out.directError = e2 instanceof Error ? e2.message : String(e2); }
        setDiag(out);
      } catch {}
    };
    const checkAuth = async () => {
      try {
        // Check if user is authenticated with SharePoint
  const authenticated = await isAuthenticated();
  if (dbg()) console.log('[admin/login] isAuthenticated =', authenticated);
        
        if (!authenticated) {
          // Redirect to SharePoint login
          if (dbg()) console.log('[admin/login] not authenticated -> redirectToLogin');
          redirectToLogin();
          return;
        }
        
        // Check if user has admin access
  const isAdmin = await hasAdminAccess();
  if (dbg()) console.log('[admin/login] hasAdminAccess =', isAdmin);
        
        if (isAdmin) {
          // Store a simple flag in localStorage
          if (dbg()) console.log('[admin/login] setting localStorage isAdmin=true and redirect /admin');
          localStorage.setItem('isAdmin', 'true');
          router.push('/admin');
        } else {
          setError('You do not have administrator privileges');
          setLoading(false);
        }
      } catch (err: unknown) {
        console.error('Auth check error:', err);
        if (dbg()) console.log('[admin/login] exception during checkAuth', err);
        setError('An error occurred while checking your credentials');
        setLoading(false);
      }
    };
    if (dbg()) runDiagnostics();
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-lg shadow-lg">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-white">
              Checking credentials...
            </h2>
            <div className="mt-4">
              <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Access Denied
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            {error}
          </p>
          
          {/* Cross-origin admin access hint */}
          {typeof window !== 'undefined' && window.location.origin !== new URL(resolveSharePointSiteUrl()).origin && (
            <div className="mt-4 p-4 bg-yellow-900 border border-yellow-700 rounded-md">
              <h3 className="text-sm font-semibold text-yellow-200 mb-2">
                🔒 Admin-Zugriff nur über SharePoint App Part
              </h3>
              <p className="text-xs text-yellow-100 mb-2">
                Admin-Funktionen sind aus Sicherheitsgründen nur verfügbar, wenn die App als SharePoint App Part geöffnet wird.
              </p>
              <p className="text-xs text-yellow-100 mb-3">
                Bitte öffnen Sie die Roadmap-Anwendung direkt in SharePoint:
              </p>
              <a
                href={resolveSharePointSiteUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-2 border border-yellow-600 text-xs font-medium rounded text-yellow-100 bg-yellow-800 hover:bg-yellow-700"
              >
                → SharePoint öffnen
              </a>
              <p className="text-xs text-gray-400 mt-3">
                Grund: Cross-Origin Requests verwenden den Service Account statt Ihrer Windows-Credentials.
              </p>
            </div>
          )}
        </div>
        {dbg() && (
          <div className="mt-4 text-xs text-gray-200 bg-gray-700 rounded p-3 overflow-auto max-h-96">
            <div className="font-semibold mb-1">Debug (auth)</div>
            <pre className="whitespace-pre-wrap break-words">{JSON.stringify(diag, null, 2)}</pre>
          </div>
        )}
        
        <div className="mt-6">
          <Link
            href="/"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Return to Roadmap
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;