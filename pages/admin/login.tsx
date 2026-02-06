import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import JSDoITLoader from '@/components/JSDoITLoader';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { buildInstanceAwareUrl, hasAdminAccess, persistAdminSession } from '@/utils/auth';

type AdminMode = 'github-secrets' | 'sharepoint-permissions';

const AdminLogin: React.FC = () => {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<string>('Prüfe Admin-Konfiguration …');
  const [mode, setMode] = useState<AdminMode | null>(null);
  const [requiresSession, setRequiresSession] = useState<boolean>(false);
  const [entraStatus, setEntraStatus] = useState<{
    enabled: boolean;
    allowlistConfigured: boolean;
  }>({ enabled: false, allowlistConfigured: false });
  const [users, setUsers] = useState<string[]>([]);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const returnUrl = (router.query.returnUrl as string) || '/admin';
  const manual = String(router.query.manual || '') === '1';
  const autoEntraSso =
    String(process.env.NEXT_PUBLIC_ENTRA_AUTO_LOGIN || '').toLowerCase() === 'true' ||
    String(router.query.autoSso || '') === '1';

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
      setStatus('Prüfe Service Account …');

      // If a valid browser session already exists, skip the login screen.
      // This prevents re-login prompts when navigating between Roadmap/Admin.
      try {
        const alreadyAuthed = await hasAdminAccess();
        if (alreadyAuthed) {
          setStatus('Bereits angemeldet. Weiterleitung …');
          setTimeout(() => router.push(returnUrl), 200);
          return;
        }
      } catch {
        // ignore and continue with normal mode detection
      }

      const response = await fetch(buildInstanceAwareUrl('/api/auth/check-admin'));
      if (!response.ok) {
        throw new Error('check-admin failed');
      }

      const data = await response.json();
      setMode(data.mode as AdminMode);
      setRequiresSession(Boolean(data.requiresUserSession));
      if (Array.isArray(data.users)) {
        setUsers(data.users);
        if (!username && data.users.length > 0) setUsername(data.users[0]);
      }

      if (data.requiresUserSession) {
        setStatus('');
        setLoading(false);
        return;
      }

      if (data.isAdmin) {
        setStatus('Service Account bestätigt. Weiterleitung …');
        setTimeout(() => router.push(returnUrl), 600);
      } else {
        setError(
          'Service Account hat keine Admin-Berechtigung. Bitte Berechtigungen in SharePoint prüfen.'
        );
        setLoading(false);
        setStatus('');
      }
    } catch (err) {
      console.error('Admin check failed:', err);
      setError('Fehler bei der Admin-Prüfung. Bitte Verbindung zu SharePoint kontrollieren.');
      setLoading(false);
      setStatus('');
    }
  };

  useEffect(() => {
    fetchAuthMode();
    fetchEntraStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optional: auto-start Entra SSO (full page redirect).
  // Popup login can't be relied upon because most browsers block it without user interaction.
  useEffect(() => {
    if (!router.isReady) return;
    if (typeof window === 'undefined') return;
    if (!autoEntraSso) return;
    if (manual) return;

    // If the callback produced an error, do not auto-retry.
    if (
      typeof router.query.error === 'string' ||
      typeof router.query.error_description === 'string'
    ) {
      return;
    }

    // Only auto-redirect when a user session is required (otherwise service-account flow will handle it).
    if (!requiresSession) return;
    if (!entraStatus.enabled) return;

    setError('');
    setStatus('Weiterleitung zu Microsoft SSO …');

    const loginUrl = buildInstanceAwareUrl(
      `/api/auth/entra/login?returnUrl=${encodeURIComponent(returnUrl)}`
    );
    window.location.assign(loginUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, autoEntraSso, manual, requiresSession, entraStatus.enabled, returnUrl]);

  // Handle non-popup Entra callback (token is placed in URL fragment).
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
      window.location.hash = '';
      setStatus('Anmeldung erfolgreich. Weiterleitung …');
      setTimeout(() => router.replace(returnUrl), 150);
    } catch {
      // ignore
    }
  }, [router.isReady, returnUrl, router]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (!username || !password) {
      setError('Bitte Benutzername und Passwort eingeben.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setStatus('Authentifiziere Benutzer …');

      const response = await fetch(buildInstanceAwareUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login fehlgeschlagen');
      }

      persistAdminSession(data.token, data.username);
      setStatus('Anmeldung erfolgreich. Weiterleitung …');
      setTimeout(() => router.push(returnUrl), 400);
    } catch (err) {
      console.error('Login failed:', err);
      setError(
        err instanceof Error ? err.message : 'Login fehlgeschlagen. Bitte erneut versuchen.'
      );
      setStatus('');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          setTimeout(() => router.push(returnUrl), 150);
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

  const isSecretsMode = requiresSession && mode === 'github-secrets';
  const showLoader = !isSecretsMode && loading;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
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
              Melde dich mit einem Service Account oder einem hinterlegten Benutzer aus den USER_*
              Secrets an, um Konfigurationen und Instanzen anzupassen.
            </p>
          </header>

          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/40 sm:p-10">
            {error && (
              <div className="mb-6 rounded-xl border border-red-500/40 bg-red-600/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {isSecretsMode ? (
              <form className="space-y-6" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-200">Benutzername</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    list={users.length > 0 ? 'admin-user-suggestions' : undefined}
                    autoComplete="username"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    placeholder="Benutzername eingeben"
                  />
                  {users.length > 0 && (
                    <datalist id="admin-user-suggestions">
                      {users.map((user) => (
                        <option key={user} value={user} />
                      ))}
                    </datalist>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-200">Passwort</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    placeholder="Passwort eingeben"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Anmeldung läuft …' : 'Anmelden'}
                </button>

                {entraStatus.enabled && (
                  <button
                    type="button"
                    onClick={startEntraPopupLogin}
                    className="w-full rounded-full border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
                  >
                    Mit Microsoft anmelden (SSO)
                  </button>
                )}

                {status && <p className="text-center text-xs text-slate-300">{status}</p>}
              </form>
            ) : showLoader ? (
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
              </div>
            )}

            <div className="mt-8 space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-xs text-slate-300">
              {isSecretsMode ? (
                <>
                  <p className="font-semibold text-slate-200">GitHub-Secrets-Authentifizierung</p>
                  <p>
                    Die verfügbaren Benutzer stammen aus den konfigurierten USER_* Secrets.
                    Erfolgreiche Logins erzeugen eine lokale Admin-Session für den Browser.
                  </p>
                  {entraStatus.enabled && !entraStatus.allowlistConfigured && (
                    <p className="text-amber-200">
                      Hinweis: Microsoft SSO ist aktiviert, aber es ist keine Allowlist gesetzt.
                      Setze ENTRA_ADMIN_UPNS (oder ENTRA_ALLOW_ALL=true) in der Umgebung.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-semibold text-slate-200">Service Account Authentifizierung</p>
                  <p>
                    Der Service Account muss Site Collection Administrator oder Mitglied der Owners
                    Gruppe sein. Zugangsdaten werden über die Umgebungsvariablen SP_USERNAME und
                    SP_PASSWORD verwaltet.
                  </p>
                  {entraStatus.enabled && (
                    <p>
                      Alternativ ist Microsoft SSO verfügbar. Admin-Zugriff wird über
                      ENTRA_ADMIN_UPNS (oder ENTRA_ALLOW_ALL) gesteuert.
                    </p>
                  )}
                </>
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
