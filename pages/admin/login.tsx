import { useEffect, useState } from 'react';
import { forceServerSideRendering } from '@/utils/serverRendering';

export const getServerSideProps = forceServerSideRendering;
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiCheckCircle, FiLock, FiLogIn, FiRefreshCw, FiShield } from 'react-icons/fi';
import JSDoITLoader from '@/components/JSDoITLoader';
import SiteHeader from '@/components/SiteHeader';
import { buildInstanceAwareUrl, hasValidAdminSession, persistAdminSession } from '@/utils/auth';
import { normalizeLocalReturnUrl } from '@/utils/sessionSecurity';

const AdminLogin: React.FC = () => {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<string>('Prüfe SSO-Konfiguration …');
  const [entraStatus, setEntraStatus] = useState<{
    enabled: boolean;
    allowlistConfigured: boolean;
  }>({ enabled: false, allowlistConfigured: false });

  const returnUrl = normalizeLocalReturnUrl(
    typeof router.query.returnUrl === 'string' ? router.query.returnUrl : null,
    '/admin'
  );
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
        | { type: 'AUTH_SUCCESS'; username?: string }
        | { type: 'AUTH_ERROR'; error?: string }
        | { type: string; [key: string]: unknown };

      const onMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        const data = event.data as unknown;
        if (!data || typeof data !== 'object') return;

        const msg = data as EntraPopupMessage;

        if (msg.type === 'AUTH_SUCCESS') {
          persistAdminSession(null, String(msg.username || 'Microsoft SSO'));
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

      <div className="ds-page-shell before:[position:absolute] before:[inset:0] before:[z-index:0] before:[pointer-events:none] before:[background-size:56px_56px] after:[position:absolute] after:[right:-10%] after:[bottom:-25%] after:[left:-10%] after:[z-index:0] after:[height:38vh] after:[pointer-events:none] [position:relative] [isolation:isolate] [display:flex] [min-height:100vh] [flex-direction:column] [overflow:hidden] [background:var(--ds-bg-page)] [color:var(--ds-text-default)] [font-family:var(--ds-font-sans)] [&>*]:[position:relative] [&>*]:[z-index:1]">
        <SiteHeader activeRoute="admin" />

        <main className="ds-page-main [flex:1] ds-login-page-main [display:flex] [align-items:center] [padding-block:clamp(44px,_7vw,_88px)]">
          <section className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-login-layout [display:grid] [grid-template-columns:minmax(0,_1fr)_minmax(340px,_440px)] [gap:clamp(36px,_6vw,_88px)] [align-items:center]">
            <div className="ds-login-hero [max-width:760px]">
              <div className="ds-eyebrow [display:inline-flex] [width:fit-content] [align-items:center] [gap:10px] [padding:9px_15px] [border:1px_solid_var(--ds-border-strong)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-accent-soft)] [color:var(--ds-text-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none] [&_svg]:[color:var(--ds-accent-strong)]">
                <FiShield className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                Administration
              </div>

              <h1 className="ds-login-title [max-width:720px] [margin:28px_0_20px] [color:var(--ds-text-strong)] [font-size:clamp(2.5rem,_5.6vw,_4.6rem)] [font-weight:600] [letter-spacing:-0.05em] [line-height:0.98] [text-wrap:balance]">
                Roadmap-Instanzen sicher verwalten.
              </h1>
              <p className="ds-login-copy [max-width:640px] [margin:0] [color:var(--ds-text-default)] [font-size:1.0625rem] [line-height:1.75]">
                Der Zugriff erfolgt ausschließlich per Microsoft SSO. Nach der Anmeldung werden
                Rollen und Instanzfreigaben geprüft, bevor der Adminbereich geöffnet wird.
              </p>

              <div
                className="ds-login-checklist [display:grid] [max-width:620px] [gap:var(--ds-space-3)] [margin-top:34px]"
                aria-label="SSO Ablauf"
              >
                <article className="ds-login-checkitem [display:flex] [gap:var(--ds-space-3)] [align-items:flex-start] [padding:18px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:color-mix(in_srgb,_var(--ds-bg-elevated-strong)_72%,_transparent)] ">
                  <span
                    className="ds-login-checkicon [display:grid] [place-items:center] [border:1px_solid_var(--ds-border-default)] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)] [width:38px] [height:38px] [border-radius:14px]"
                    aria-hidden="true"
                  >
                    <FiCheckCircle className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                  </span>
                  <div>
                    <h2 className="ds-login-check-title [margin:0] [color:var(--ds-text-strong)] [font-size:0.875rem] [font-weight:600]">
                      Single Sign-on
                    </h2>
                    <p className="ds-login-check-copy [margin:6px_0_0] [color:var(--ds-text-muted)] [font-size:0.875rem] [line-height:1.55]">
                      Anmeldung über die bestehende Microsoft-Entra-Session.
                    </p>
                  </div>
                </article>
                <article className="ds-login-checkitem [display:flex] [gap:var(--ds-space-3)] [align-items:flex-start] [padding:18px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:color-mix(in_srgb,_var(--ds-bg-elevated-strong)_72%,_transparent)] ">
                  <span
                    className="ds-login-checkicon [display:grid] [place-items:center] [border:1px_solid_var(--ds-border-default)] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)] [width:38px] [height:38px] [border-radius:14px]"
                    aria-hidden="true"
                  >
                    <FiLock className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                  </span>
                  <div>
                    <h2 className="ds-login-check-title [margin:0] [color:var(--ds-text-strong)] [font-size:0.875rem] [font-weight:600]">
                      Instanzfreigaben
                    </h2>
                    <p className="ds-login-check-copy [margin:6px_0_0] [color:var(--ds-text-muted)] [font-size:0.875rem] [line-height:1.55]">
                      Berechtigungen werden gegen Rollen, Gruppen und Instanzen validiert.
                    </p>
                  </div>
                </article>
              </div>
            </div>

            <aside
              className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-login-panel [padding:clamp(26px,_4vw,_36px)] [border-radius:var(--ds-radius-xl)]"
              aria-label="Microsoft SSO Anmeldung"
            >
              <div className="ds-login-panel-header [display:flex] [gap:var(--ds-space-3)] [align-items:center] [margin-bottom:24px]">
                <div
                  className="ds-login-icon [display:grid] [place-items:center] [border:1px_solid_var(--ds-border-default)] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)] [width:52px] [height:52px] [border-radius:18px]"
                  aria-hidden="true"
                >
                  <FiLock className="ds-icon-md [flex:0_0_auto] [width:1.5rem] [height:1.5rem]" />
                </div>
                <div>
                  <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                    Microsoft SSO
                  </p>
                  <h2 className="ds-panel-title [margin:0] [color:var(--ds-text-strong)] [font-size:clamp(1.5rem,_3vw,_2.125rem)] [letter-spacing:-0.04em] [line-height:1.15]">
                    Anmelden
                  </h2>
                </div>
              </div>

              {error && (
                <div className="ds-form-error [margin:0] [padding:12px_14px] [border:1px_solid_color-mix(in_srgb,_var(--ds-danger)_36%,_transparent)] [border-radius:var(--ds-radius-sm)] [background:color-mix(in_srgb,_var(--ds-danger)_12%,_transparent)] [color:var(--ds-danger)] [font-size:0.875rem] [line-height:1.5] ds-login-alert [margin-bottom:18px]">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="ds-login-loading [display:grid] [justify-items:center] [gap:var(--ds-space-4)] [padding-block:34px] [text-align:center]">
                  <JSDoITLoader sizeRem={2.5} message={status || 'SSO-Session wird geprüft …'} />
                  <p className="ds-small-text [margin:0] [color:var(--ds-text-default)] [font-size:0.875rem] [line-height:1.55]">
                    Bitte einen Moment warten, während die bestehende SSO-Session geprüft wird.
                  </p>
                </div>
              ) : (
                <div className="ds-login-actions-panel [display:grid] [gap:var(--ds-space-4)]">
                  <p className="ds-login-panel-copy [margin:0] [color:var(--ds-text-default)] [font-size:0.9375rem] [line-height:1.65]">
                    Melde dich mit Microsoft SSO an, um deine Roadmap-Berechtigungen zu prüfen und
                    den Adminbereich zu öffnen.
                  </p>

                  {entraStatus.enabled ? (
                    <button
                      onClick={startEntraPopupLogin}
                      className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)] ds-login-button [width:100%]"
                    >
                      <FiLogIn className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                      Mit Microsoft anmelden
                    </button>
                  ) : (
                    <div className="ds-login-warning [padding:14px_16px] [border:1px_solid_color-mix(in_srgb,_var(--ds-warning)_42%,_transparent)] [border-radius:var(--ds-radius-sm)] [background:color-mix(in_srgb,_var(--ds-warning)_12%,_transparent)] [color:var(--ds-warning)] [font-size:0.875rem] [line-height:1.55]">
                      Microsoft SSO ist nicht konfiguriert. Bitte aktiviere die Entra-Konfiguration,
                      bevor du dich anmelden kannst.
                    </div>
                  )}

                  <button
                    onClick={() => {
                      fetchAuthMode();
                      fetchEntraStatus();
                    }}
                    className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)] ds-login-button [width:100%]"
                  >
                    <FiRefreshCw className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                    Status erneut prüfen
                  </button>

                  {status && (
                    <p className="ds-login-status [margin:0] [color:var(--ds-text-muted)] [font-size:0.8125rem] [font-weight:600] [text-align:center]">
                      {status}
                    </p>
                  )}
                </div>
              )}

              <div className="ds-login-note [margin-top:26px] [padding:18px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-soft)] [color:var(--ds-text-muted)] [font-size:0.8125rem] [line-height:1.55] [&_p:last-child]:[margin-bottom:0]">
                <p className="ds-login-note-title [margin:0_0_8px] [color:var(--ds-text-strong)] [font-weight:600]">
                  Session-Prüfung
                </p>
                <p>
                  Die Admin-Session wird serverseitig erstellt und anschließend für die aktuell
                  freigegebenen Roadmap-Instanzen verwendet.
                </p>
              </div>
            </aside>
          </section>
        </main>

        <footer className="ds-footer [border-top:1px_solid_var(--ds-border-subtle)] [background:color-mix(in_srgb,_var(--ds-bg-page)_82%,_transparent)] ">
          <div className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-footer-inner [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-4)] [padding-block:24px] [color:var(--ds-text-muted)] [font-size:0.875rem] max-[760px]:[align-items:flex-start] max-[760px]:[flex-direction:column]">
            <span>JSDoIT Roadmap Center</span>
            <div className="ds-footer-links [display:flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-4)]">
              <Link
                className="ds-footer-link [color:var(--ds-text-muted)] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
                href="/landing"
              >
                Start
              </Link>
              <Link
                className="ds-footer-link [color:var(--ds-text-muted)] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
                href="/instances"
              >
                Instanzen
              </Link>
              <Link
                className="ds-footer-link [color:var(--ds-text-muted)] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
                href="/help"
              >
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
