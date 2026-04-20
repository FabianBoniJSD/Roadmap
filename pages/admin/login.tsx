import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import JSDoITLoader from '@/components/JSDoITLoader';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { buildInstanceAwareUrl, hasValidAdminSession, persistAdminSession } from '@/utils/auth';

const AdminLogin: React.FC = () => {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<string>('Prüfe Admin-Konfiguration …');
  const [entraStatus, setEntraStatus] = useState<{
    enabled: boolean;
    allowlistConfigured: boolean;
  }>({ enabled: false, allowlistConfigured: false });

  const normalizeReturnUrl = (value: unknown, fallback = '/admin') => {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return fallback;
    if (!raw.startsWith('/')) return fallback;
    if (raw.startsWith('//')) return fallback;
    const [pathOnly] = raw.split('?', 1);
    return pathOnly || fallback;
  };

  const returnUrl = normalizeReturnUrl(router.query.returnUrl, '/admin');
  const manual = String(router.query.manual || '') === '1';
  const autoEntraSso =
    String(process.env.NEXT_PUBLIC_ENTRA_AUTO_LOGIN || '').toLowerCase() === 'true' ||
    String(router.query.autoSso || '') === '1';

  useEffect(() => {
    if (!router.isReady) return;
    const errorParam = typeof router.query.error === 'string' ? router.query.error : '';
    const descParam =
      typeof router.query.error_description === 'string' ? router.query.error_description : '';
    const msg = descParam || errorParam;
    if (msg) {
      setError(msg);
    }
  }, [router.isReady, router.query.error, router.query.error_description]);

  const fetchEntraStatus = async () => {
    try {
      const resp = await fetch(buildInstanceAwareUrl('/api/auth/entra/status'));
      if (!resp.ok) return;
      const data = await resp.json();
      setEntraStatus({
        enabled: Boolean(data.enabled),
        allowlistConfigured: Boolean(data.allowlistConfigured),
      });
    } catch {
      // ignore
    }
  };

  const fetchAuthMode = async () => {
    try {
      setLoading(true);
      setError('');
      setStatus('Prüfe Admin-Session …');

      try {
        const alreadyAuthed = await hasValidAdminSession();
        if (alreadyAuthed) {
          setStatus('Bereits angemeldet. Weiterleitung …');
          setTimeout(() => router.push(returnUrl), 200);
          return;
        }
      } catch {
        // ignore and continue
      }
      setStatus('');
    } catch (err) {
      console.error('Admin check failed:', err);
      setError('Fehler bei der Session-Prüfung. Bitte erneut anmelden.');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthMode();
    fetchEntraStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    if (typeof window === 'undefined') return;
    if (!autoEntraSso) return;
    if (manual) return;
    if (loading) return;
    if (!error) return;
    if (!entraStatus.enabled) return;

    if (
      typeof router.query.error === 'string' ||
      typeof router.query.error_description === 'string'
    ) {
      return;
    }

    setError('');
    setStatus('Weiterleitung zu Microsoft SSO …');

    const loginUrl = buildInstanceAwareUrl(
      `/api/auth/entra/login?returnUrl=${encodeURIComponent(returnUrl)}`
    );
    window.location.assign(loginUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, autoEntraSso, manual, loading, error, entraStatus.enabled, returnUrl]);

  useEffect(() => {
    if (!router.isReady) return;
    if (typeof window === 'undefined') return;
    try {
      const hash = window.location.hash || '';
      if (!hash.startsWith('#')) return;
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('token');
      const u = params.get('username');
      if (!token) return;

      persistAdminSession(token, u || 'Microsoft SSO');
      setStatus('Anmeldung erfolgreich. Weiterleitung …');
      try {
        const cleanUrl = returnUrl || '/admin';
        window.location.replace(cleanUrl);
        return;
      } catch {
        window.location.hash = '';
      }
      setTimeout(() => window.location.reload(), 150);
    } catch {
      // ignore
    }
  }, [router.isReady, returnUrl, router]);

  const startEntraPopupLogin = async () => {
    try {
      setError('');
      setStatus('Microsoft SSO wird geöffnet …');

      const popupUrl = buildInstanceAwareUrl(
        `/api/auth/entra/login?popup=1&returnUrl=${encodeURIComponent(returnUrl)}`
      );

      const popup = window.open(
        popupUrl,
        'entraSsoLogin',
        'width=520,height=720,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
      );

      if (!popup) {
        setStatus('');
        setError('Popup wurde blockiert. Bitte Popups erlauben und erneut versuchen.');
        return;
      }

      type EntraPopupMessage =
        | { type: 'AUTH_SUCCESS'; token: string; username?: string }
        | { type: 'AUTH_ERROR'; error?: string }
        | { type: string; [key: string]: unknown };

      const onMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        const data = event.data as unknown;
        if (!data || typeof data !== 'object') return;

        const msg = data as EntraPopupMessage;

        if (msg.type === 'AUTH_SUCCESS' && typeof msg.token === 'string') {
          persistAdminSession(msg.token, String(msg.username || 'Microsoft SSO'));
          setStatus('Anmeldung erfolgreich. Weiterleitung …');
          window.removeEventListener('message', onMessage);
          try {
            popup.close();
          } catch {
            // ignore
          }
          setTimeout(() => window.location.replace(returnUrl), 150);
        }

        if (msg.type === 'AUTH_ERROR') {
          setStatus('');
          setError(String(msg.error || 'SSO fehlgeschlagen'));
          window.removeEventListener('message', onMessage);
        }
      };

      window.addEventListener('message', onMessage);

      const poll = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(poll);
          window.removeEventListener('message', onMessage);
          setStatus('');
        }
      }, 500);
    } catch (err) {
      setStatus('');
      setError(err instanceof Error ? err.message : 'SSO fehlgeschlagen');
    }
  };

  return (
    <div className="theme-page-shell flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <SiteHeader activeRoute="admin" />
      <main className="flex-1">
        <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16 sm:px-8">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-sky-300/90">
              Administration
            </p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Roadmap-Instanzen verwalten
            </h1>
            <p className="text-sm text-slate-300 sm:text-base">
              Der Zugriff erfolgt über Service-Account-Berechtigung in SharePoint oder alternativ
              per Microsoft SSO.
            </p>
          </header>

          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/40 sm:p-10">
            {error && (
              <div className="mb-6 rounded-xl border border-red-500/40 bg-red-600/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center gap-6 py-10">
                <JSDoITLoader sizeRem={2.5} message={status || 'Service Account wird geprüft …'} />
                <p className="text-xs text-slate-300">
                  Bitte einen Moment warten, während der Service Account validiert wird.
                </p>
              </div>
            ) : (
              <div className="space-y-6 text-sm text-slate-300">
                <p>
                  Der Service Account hat keine ausreichenden Rechte oder konnte nicht validiert
                  werden. Bitte prüfe die Mitgliedschaft in der Owners- oder Site-Admin-Gruppe und
                  versuche es erneut.
                </p>

                {entraStatus.enabled && (
                  <button
                    onClick={startEntraPopupLogin}
                    className="w-full rounded-full bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
                  >
                    Mit Microsoft anmelden (SSO)
                  </button>
                )}

                <button
                  onClick={() => fetchAuthMode()}
                  className="w-full rounded-full border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
                >
                  Erneut prüfen
                </button>

                {status && <p className="text-center text-xs text-slate-300">{status}</p>}
              </div>
            )}

            <div className="mt-8 space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-xs text-slate-300">
              <p className="font-semibold text-slate-200">Service Account Authentifizierung</p>
              <p>
                Der Service Account muss Site Collection Administrator oder Mitglied der Owners
                Gruppe sein. Zugangsdaten werden über die Umgebungsvariablen SP_USERNAME und
                SP_PASSWORD verwaltet.
              </p>
              {entraStatus.enabled && (
                <p>
                  Alternativ ist Microsoft SSO verfügbar. Standardmäßig können sich alle erfolgreich
                  per Entra authentifizierten Benutzer anmelden.
                </p>
              )}
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm font-semibold text-sky-300 transition hover:text-white"
            >
              Zurück zur Startseite
            </button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default AdminLogin;
