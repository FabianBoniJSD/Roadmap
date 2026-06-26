import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiCheckCircle, FiLock, FiLogIn, FiRefreshCw, FiShield } from 'react-icons/fi';
import JSDoITLoader from '@/components/JSDoITLoader';
import SiteHeader from '@/components/SiteHeader';
import { buildInstanceAwareUrl, hasValidAdminSession, persistAdminSession } from '@/utils/auth';

const AdminLogin: React.FC = () => {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<string>('Prüfe SSO-Konfiguration …');
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
      setStatus('Prüfe SSO-Session …');

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
    if (loading) return;
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
  }, [router.isReady, autoEntraSso, loading, entraStatus.enabled, returnUrl]);

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
    <>
      <Head>
        <title>Anmeldung | JSDoIT Roadmap</title>
      </Head>

      <div className="ds-page-shell">
        <SiteHeader activeRoute="admin" />

        <main className="ds-page-main ds-login-page-main">
          <section className="ds-container ds-login-layout">
            <div className="ds-login-hero">
              <div className="ds-eyebrow">
                <FiShield className="ds-icon-sm" />
                Administration
              </div>

              <h1 className="ds-login-title">Roadmap-Instanzen sicher verwalten.</h1>
              <p className="ds-login-copy">
                Der Zugriff erfolgt ausschließlich per Microsoft SSO. Nach der Anmeldung werden
                Rollen und Instanzfreigaben geprüft, bevor der Adminbereich geöffnet wird.
              </p>

              <div className="ds-login-checklist" aria-label="SSO Ablauf">
                <article className="ds-login-checkitem">
                  <span className="ds-login-checkicon" aria-hidden="true">
                    <FiCheckCircle className="ds-icon-sm" />
                  </span>
                  <div>
                    <h2 className="ds-login-check-title">Single Sign-on</h2>
                    <p className="ds-login-check-copy">
                      Anmeldung über die bestehende Microsoft-Entra-Session.
                    </p>
                  </div>
                </article>
                <article className="ds-login-checkitem">
                  <span className="ds-login-checkicon" aria-hidden="true">
                    <FiLock className="ds-icon-sm" />
                  </span>
                  <div>
                    <h2 className="ds-login-check-title">Instanzfreigaben</h2>
                    <p className="ds-login-check-copy">
                      Berechtigungen werden gegen Rollen, Gruppen und Instanzen validiert.
                    </p>
                  </div>
                </article>
              </div>
            </div>

            <aside className="ds-card ds-login-panel" aria-label="Microsoft SSO Anmeldung">
              <div className="ds-login-panel-header">
                <div className="ds-login-icon" aria-hidden="true">
                  <FiLock className="ds-icon-md" />
                </div>
                <div>
                  <p className="ds-panel-label">Microsoft SSO</p>
                  <h2 className="ds-panel-title">Anmelden</h2>
                </div>
              </div>

              {error && <div className="ds-form-error ds-login-alert">{error}</div>}

              {loading ? (
                <div className="ds-login-loading">
                  <JSDoITLoader sizeRem={2.5} message={status || 'SSO-Session wird geprüft …'} />
                  <p className="ds-small-text">
                    Bitte einen Moment warten, während die bestehende SSO-Session geprüft wird.
                  </p>
                </div>
              ) : (
                <div className="ds-login-actions-panel">
                  <p className="ds-login-panel-copy">
                    Melde dich mit Microsoft SSO an, um deine Roadmap-Berechtigungen zu prüfen und
                    den Adminbereich zu öffnen.
                  </p>

                  {entraStatus.enabled ? (
                    <button
                      onClick={startEntraPopupLogin}
                      className="ds-button ds-button-primary ds-login-button"
                    >
                      <FiLogIn className="ds-icon-sm" />
                      Mit Microsoft anmelden
                    </button>
                  ) : (
                    <div className="ds-login-warning">
                      Microsoft SSO ist nicht konfiguriert. Bitte aktiviere die Entra-Konfiguration,
                      bevor du dich anmelden kannst.
                    </div>
                  )}

                  <button
                    onClick={() => {
                      fetchAuthMode();
                      fetchEntraStatus();
                    }}
                    className="ds-button ds-button-secondary ds-login-button"
                  >
                    <FiRefreshCw className="ds-icon-sm" />
                    Status erneut prüfen
                  </button>

                  {status && <p className="ds-login-status">{status}</p>}
                </div>
              )}

              <div className="ds-login-note">
                <p className="ds-login-note-title">Session-Prüfung</p>
                <p>
                  Die Admin-Session wird serverseitig erstellt und anschließend für die aktuell
                  freigegebenen Roadmap-Instanzen verwendet.
                </p>
              </div>
            </aside>
          </section>
        </main>

        <footer className="ds-footer">
          <div className="ds-container ds-footer-inner">
            <span>JSDoIT Roadmap Center</span>
            <div className="ds-footer-links">
              <Link className="ds-footer-link" href="/landing">
                Start
              </Link>
              <Link className="ds-footer-link" href="/instances">
                Instanzen
              </Link>
              <Link className="ds-footer-link" href="/help">
                Hilfe
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default AdminLogin;
