import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { FiArrowRight, FiExternalLink, FiLayers, FiLock, FiMapPin, FiStar } from 'react-icons/fi';
import prisma from '@/lib/prisma';
import JSDoITLoader from '@/components/JSDoITLoader';
import SiteHeader from '@/components/SiteHeader';
import {
  ADMIN_SESSION_CHANGED_EVENT,
  buildInstanceAwareUrl,
  getAdminSessionState,
} from '@/utils/auth';
import { extractAdminSessionFromHeaders } from '@/utils/apiAuth';
import {
  isReadSessionAllowedForInstance,
  resolveSessionDepartmentAcrossInstances,
} from '@/utils/instanceAccessServer';
import { isDbSuperAdminSession } from '@/utils/superAdminAccessServer';

const HTTP_URL_REGEX = /^https?:\/\//i;

type LandingInstance = {
  slug: string;
  displayName: string;
  department: string | null;
  description: string | null;
  sharePointUrl: string;
  strategy: string;
  hosts: string[];
  frontendTarget: string | null;
  landingPage: string | null;
};

type LandingPageProps = {
  instances: LandingInstance[];
};

type MetadataRecord = Record<string, unknown>;

const isRecord = (value: unknown): MetadataRecord | undefined => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as MetadataRecord;
  }
  return undefined;
};

const toTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const firstStringFromArray = (value: unknown): string | null => {
  if (!Array.isArray(value)) return null;
  for (const entry of value) {
    const candidate = toTrimmedString(entry);
    if (candidate) return candidate;
  }
  return null;
};

const parseMetadata = (settingsJson?: string | null): MetadataRecord | undefined => {
  if (!settingsJson) return undefined;
  try {
    const parsed = JSON.parse(settingsJson);
    const parsedRecord = isRecord(parsed);
    const metadataCandidate = parsedRecord?.metadata;
    return isRecord(metadataCandidate);
  } catch {
    return undefined;
  }
};

const joinNormalizedPaths = (basePath: string, extraPath?: string | null): string => {
  const baseSegments = String(basePath || '')
    .split('/')
    .filter(Boolean);
  const extraSegments = String(extraPath || '')
    .split('/')
    .filter(Boolean);

  if (!extraSegments.length) {
    return baseSegments.length ? `/${baseSegments.join('/')}` : '';
  }

  let overlap = 0;
  for (let size = Math.min(baseSegments.length, extraSegments.length); size > 0; size -= 1) {
    const baseTail = baseSegments.slice(-size).map((segment) => segment.toLowerCase());
    const extraHead = extraSegments.slice(0, size).map((segment) => segment.toLowerCase());
    if (baseTail.every((segment, index) => segment === extraHead[index])) {
      overlap = size;
      break;
    }
  }

  const joinedSegments = [...baseSegments, ...extraSegments.slice(overlap)];
  return joinedSegments.length ? `/${joinedSegments.join('/')}` : '';
};

const buildTargetFromHost = (hostValue: string | null, path?: string | null): string | null => {
  if (!hostValue) return null;
  const trimmed = hostValue.trim();
  if (!trimmed) return null;
  if (HTTP_URL_REGEX.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const joinedPath = joinNormalizedPaths(parsed.pathname, path);
      return `${parsed.origin}${joinedPath}${parsed.search}${parsed.hash}`;
    } catch {
      const sanitized = trimmed.replace(/\/+$/, '');
      return `${sanitized}${joinNormalizedPaths('', path)}`;
    }
  }
  if (trimmed.startsWith('//')) {
    try {
      const parsed = new URL(`https:${trimmed}`);
      const joinedPath = joinNormalizedPaths(parsed.pathname, path);
      return `//${parsed.host}${joinedPath}${parsed.search}${parsed.hash}`;
    } catch {
      const sanitized = trimmed.replace(/\/+$/, '');
      return `${sanitized}${joinNormalizedPaths('', path)}`;
    }
  }
  if (trimmed.startsWith('/')) {
    return joinNormalizedPaths(trimmed, path);
  }
  try {
    const parsed = new URL(`https://${trimmed}`);
    const joinedPath = joinNormalizedPaths(parsed.pathname, path);
    return `//${parsed.host}${joinedPath}${parsed.search}${parsed.hash}`;
  } catch {
    const sanitizedHost = trimmed.replace(/\/+$/, '');
    return `//${sanitizedHost}${joinNormalizedPaths('', path)}`;
  }
};

const resolveFrontendTarget = (settingsJson: string | null, hosts: string[]): string | null => {
  const metadata = parseMetadata(settingsJson);
  const frontendConfig = isRecord(metadata?.frontend);
  const directUrl = toTrimmedString(metadata?.frontendUrl) || toTrimmedString(frontendConfig?.url);
  if (directUrl) {
    return directUrl;
  }
  const hostCandidate =
    toTrimmedString(metadata?.frontendHost) ||
    firstStringFromArray(metadata?.frontendHosts) ||
    toTrimmedString(frontendConfig?.host) ||
    hosts[0] ||
    null;
  if (!hostCandidate) return null;
  const pathCandidate =
    toTrimmedString(metadata?.frontendPath) || toTrimmedString(frontendConfig?.path) || null;
  return buildTargetFromHost(hostCandidate, pathCandidate);
};

const InstancesPage = ({ instances }: LandingPageProps) => {
  const router = useRouter();
  const [selectingSlug, setSelectingSlug] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visibleInstances, setVisibleInstances] = useState<LandingInstance[]>(instances);
  const [instancesLoading, setInstancesLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [canManageInstances, setCanManageInstances] = useState(false);
  const [entraEnabled, setEntraEnabled] = useState(false);
  const [authStatus, setAuthStatus] = useState<string>('');
  const [sessionRevision, setSessionRevision] = useState(0);

  const returnUrl = useMemo(() => {
    const raw = typeof router.asPath === 'string' ? router.asPath : '/instances';
    return raw.split('#')[0] || '/instances';
  }, [router.asPath]);

  const autoEntraSso =
    String(process.env.NEXT_PUBLIC_ENTRA_AUTO_LOGIN || '').toLowerCase() === 'true' ||
    String(router.query.autoSso || '') === '1';

  useEffect(() => {
    setVisibleInstances(instances);
  }, [instances]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleSessionChanged = () => {
      setSessionRevision((prev) => prev + 1);
    };
    window.addEventListener(ADMIN_SESSION_CHANGED_EVENT, handleSessionChanged);
    window.addEventListener('focus', handleSessionChanged);
    return () => {
      window.removeEventListener(ADMIN_SESSION_CHANGED_EVENT, handleSessionChanged);
      window.removeEventListener('focus', handleSessionChanged);
    };
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    let cancelled = false;

    const run = async () => {
      try {
        try {
          const resp = await fetch(buildInstanceAwareUrl('/api/auth/entra/status'));
          if (resp.ok) {
            const data = await resp.json();
            if (!cancelled) setEntraEnabled(Boolean(data.enabled));
          }
        } catch {
          // ignore
        }

        const sessionState = await getAdminSessionState();
        if (!cancelled) {
          setAuthed(Boolean(sessionState?.authenticated));
          setCanManageInstances(Boolean(sessionState?.isSuperAdmin));
        }
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, sessionRevision]);

  useEffect(() => {
    if (!authChecked || !authed) return;
    let cancelled = false;

    const run = async () => {
      setInstancesLoading(true);
      try {
        const resp = await fetch(buildInstanceAwareUrl('/api/instances/slugs?details=landing'), {
          credentials: 'same-origin',
        });
        const payload = await resp.json().catch(() => null);
        if (!resp.ok) {
          throw new Error(payload?.error || 'Instanzen konnten nicht geladen werden');
        }
        if (!cancelled) {
          setVisibleInstances(Array.isArray(payload?.instances) ? payload.instances : []);
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : 'Instanzen konnten nicht geladen werden';
          setErrorMessage(message);
        }
      } finally {
        if (!cancelled) setInstancesLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [authChecked, authed, sessionRevision]);

  useEffect(() => {
    if (!router.isReady) return;
    if (typeof window === 'undefined') return;
    if (!authChecked) return;
    if (authed) return;
    if (!entraEnabled) return;
    if (!autoEntraSso) return;

    if (
      typeof router.query.error === 'string' ||
      typeof router.query.error_description === 'string'
    ) {
      return;
    }

    setAuthStatus('Weiterleitung zu Microsoft SSO ...');
    const loginUrl = buildInstanceAwareUrl(
      `/api/auth/entra/login?returnUrl=${encodeURIComponent(returnUrl)}`
    );
    window.location.assign(loginUrl);
  }, [router.isReady, authChecked, authed, entraEnabled, autoEntraSso, returnUrl, router.query]);

  const startSso = () => {
    const loginUrl = buildInstanceAwareUrl(
      `/api/auth/entra/login?returnUrl=${encodeURIComponent(returnUrl)}`
    );
    window.location.assign(loginUrl);
  };

  const buildClientRedirectUrl = (target?: string | null): string | null => {
    if (!target) return null;
    if (HTTP_URL_REGEX.test(target) || target.startsWith('/')) {
      return target;
    }
    if (target.startsWith('//')) {
      const protocol =
        typeof window !== 'undefined' && window.location?.protocol
          ? window.location.protocol
          : 'https:';
      return `${protocol}${target}`;
    }
    return `https://${target}`;
  };

  const appendInstanceQuery = (url: string, slug: string) => {
    if (!slug) return url;
    const [base, hash] = url.split('#');
    const separator = base.includes('?') ? '&' : '?';
    const withQuery = `${base}${separator}roadmapInstance=${encodeURIComponent(slug)}`;
    return hash ? `${withQuery}#${hash}` : withQuery;
  };

  const openInstance = async (instance?: LandingInstance) => {
    if (typeof window === 'undefined' || !instance?.slug) return;
    if (!authed) return;
    setSelectingSlug(instance.slug);
    setErrorMessage(null);
    try {
      document.cookie = `roadmap-instance=${encodeURIComponent(instance.slug)}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;

      try {
        await fetch('/api/instances/select', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: instance.slug }),
        });
      } catch {
        // ignore and continue with client-side redirect + cookie fallback
      }

      const target = buildClientRedirectUrl(instance.frontendTarget) || '/roadmap';
      const redirectTarget = appendInstanceQuery(target, instance.slug);
      window.location.assign(redirectTarget);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setErrorMessage(message);
      setSelectingSlug(null);
    }
  };

  return (
    <>
      <Head>
        <title>JSDoIT Instanzübersicht</title>
      </Head>
      <div className="ds-page-shell before:[position:absolute] before:[inset:0] before:[z-index:0] before:[pointer-events:none] before:[background-size:56px_56px] after:[position:absolute] after:[right:-10%] after:[bottom:-25%] after:[left:-10%] after:[z-index:0] after:[height:38vh] after:[pointer-events:none] [position:relative] [isolation:isolate] [display:flex] [min-height:100vh] [flex-direction:column] [overflow:hidden] [background:var(--ds-bg-page)] [color:var(--ds-text-default)] [font-family:var(--ds-font-sans)] [&>*]:[position:relative] [&>*]:[z-index:1]">
        <SiteHeader activeRoute="instances" />

        <main className="ds-page-main [flex:1]">
          <section className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] [display:grid] [grid-template-columns:minmax(0,_0.82fr)_minmax(460px,_1.18fr)] [align-items:center] [gap:clamp(36px,_6vw,_88px)] [padding-block:clamp(42px,_6vw,_72px)] max-[1000px]:[grid-template-columns:1fr] max-[760px]:[padding-block:34px_46px]">
            <div className="ds-hero-content [max-width:640px]">
              <div className="ds-eyebrow [display:inline-flex] [width:fit-content] [align-items:center] [gap:10px] [padding:9px_15px] [border:1px_solid_var(--ds-border-strong)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-accent-soft)] [color:var(--ds-text-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none] [&_svg]:[color:var(--ds-accent-strong)]">
                <FiStar className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                Instanzübersicht
              </div>

              <h1 className="ds-hero-title [max-width:650px] [margin:26px_0_20px] [color:var(--ds-text-strong)] [font-size:clamp(2.5rem,_5vw,_4.25rem)] [font-weight:600] [letter-spacing:-0.06em] [line-height:0.98] [text-wrap:balance]">
                Wähle deine{' '}
                <span className="ds-accent-text [background:var(--ds-accent)]">
                  Roadmap-Instanz
                </span>
              </h1>
              <p className="ds-hero-copy [max-width:570px] [margin:0] [color:var(--ds-text-default)] [font-size:1.0625rem] [line-height:1.7]">
                Deine freigegebenen Roadmaps stehen direkt zur Auswahl. Ein Klick verbindet dich mit
                der passenden Instanz.
              </p>
            </div>

            <aside
              className="ds-instance-spotlight [position:relative] [overflow:hidden] [padding:clamp(22px,_3vw,_30px)] [border:1px_solid_var(--ds-border-strong)] [border-radius:28px] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative]"
              aria-label="Direkte Instanzauswahl"
            >
              <div className="[display:flex] [align-items:center] [justify-content:space-between] [gap:16px] [margin-bottom:20px]">
                <div>
                  <p className="[margin:0_0_7px] [color:var(--ds-accent-strong)] [font-size:0.72rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                    Deine Roadmaps
                  </p>
                  <h2 className="[margin:0] [color:var(--ds-text-strong)] [font-size:clamp(1.4rem,_2.4vw,_1.9rem)] [font-weight:600] [letter-spacing:-0.04em]">
                    Direkt einsteigen
                  </h2>
                </div>
                {authChecked && authed ? (
                  <span className="[display:grid] [min-width:48px] [height:48px] [place-items:center] [padding-inline:12px] [border:1px_solid_var(--ds-border-strong)] [border-radius:16px] [background:var(--ds-accent-soft)] [color:var(--ds-text-strong)] [font-size:1.05rem] [font-weight:600]">
                    {visibleInstances.length}
                  </span>
                ) : (
                  <div className="[display:grid] [width:48px] [height:48px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:16px] [background:var(--ds-bg-soft)] [color:var(--ds-accent-strong)]">
                    <FiLock className="[width:1.2rem] [height:1.2rem]" />
                  </div>
                )}
              </div>

              {!authChecked ? (
                <div className="[display:flex] [justify-content:center] [padding-block:34px]">
                  <JSDoITLoader sizeRem={2} message={authStatus || 'Anmeldung wird geprüft ...'} />
                </div>
              ) : authed ? (
                <>
                  {visibleInstances.length ? (
                    <div className="[display:grid] [gap:10px]">
                      {visibleInstances.map((instance) => (
                        <button
                          key={instance.slug}
                          type="button"
                          onClick={() => openInstance(instance)}
                          disabled={selectingSlug !== null}
                          className="group [display:grid] [width:100%] [grid-template-columns:48px_minmax(0,_1fr)_34px] [align-items:center] [gap:14px] [padding:13px_14px] [border:1px_solid_var(--ds-border-default)] [border-radius:17px] [background:color-mix(in_srgb,_var(--ds-bg-elevated-strong)_88%,_transparent)] [color:var(--ds-text-strong)] [text-align:left] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_border-color_var(--ds-duration-fast)_var(--ds-ease-out),_background_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[border-color:var(--ds-accent-strong)] hover:[background:var(--ds-bg-elevated-strong)] disabled:[cursor:wait] disabled:[opacity:0.65]"
                        >
                          <span className="[display:grid] [width:48px] [height:48px] [place-items:center] [border-radius:15px] [background:var(--ds-accent)] [color:var(--ds-text-inverse)] [font-size:0.8rem] [font-weight:600] [letter-spacing:normal]">
                            {instance.displayName.slice(0, 1)}
                          </span>
                          <span className="[min-width:0]">
                            <strong className="[display:block] [overflow:hidden] [font-size:1.05rem] [font-weight:600] [text-overflow:ellipsis] [white-space:nowrap]">
                              {instance.displayName}
                            </strong>
                            <small className="[display:block] [overflow:hidden] [margin-top:3px] [color:var(--ds-text-muted)] [font-size:0.78rem] [text-overflow:ellipsis] [white-space:nowrap]">
                              {instance.department || 'Allgemeine Roadmap'}
                            </small>
                          </span>
                          <FiArrowRight className="[width:1.15rem] [height:1.15rem] [color:var(--ds-accent-strong)] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out)] " />
                        </button>
                      ))}
                    </div>
                  ) : instancesLoading ? (
                    <div className="[display:flex] [justify-content:center] [padding-block:28px]">
                      <JSDoITLoader sizeRem={1.8} message="Instanzen werden geladen ..." />
                    </div>
                  ) : (
                    <div className="[padding:20px] [border:1px_dashed_var(--ds-border-default)] [border-radius:17px] [background:var(--ds-bg-soft)] [text-align:center]">
                      <strong className="[display:block] [color:var(--ds-text-strong)]">
                        Keine freigegebenen Instanzen
                      </strong>
                      <p className="[margin:7px_0_0] [color:var(--ds-text-muted)] [font-size:0.85rem] [line-height:1.55]">
                        {canManageInstances
                          ? 'Lege die erste Roadmap-Instanz in der Verwaltung an.'
                          : 'Für dein Konto ist aktuell keine Roadmap freigegeben.'}
                      </p>
                    </div>
                  )}

                  {errorMessage ? (
                    <p className="[margin:14px_0_0] [padding:12px_14px] [border:1px_solid_color-mix(in_srgb,_var(--ds-danger)_38%,_transparent)] [border-radius:14px] [background:color-mix(in_srgb,_var(--ds-danger)_12%,_transparent)] [color:var(--ds-danger)] [font-size:0.8rem]">
                      {errorMessage}
                    </p>
                  ) : null}

                  {canManageInstances ? (
                    <Link
                      href="/admin/instances"
                      className="[display:inline-flex] [align-items:center] [gap:8px] [margin-top:16px] [color:var(--ds-text-default)] [font-size:0.82rem] [font-weight:600] hover:[color:var(--ds-accent-strong)]"
                    >
                      Instanzen verwalten
                      <FiExternalLink className="[width:0.9rem] [height:0.9rem]" />
                    </Link>
                  ) : null}
                </>
              ) : (
                <div className="[padding:20px] [border:1px_solid_var(--ds-border-default)] [border-radius:18px] [background:color-mix(in_srgb,_var(--ds-bg-elevated-strong)_84%,_transparent)]">
                  <p className="[margin:0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.6]">
                    Melde dich an, damit wir dir deine freigegebenen Roadmap-Instanzen anzeigen
                    können.
                  </p>
                  <div className="[display:grid] [gap:10px] [margin-top:17px]">
                    {entraEnabled ? (
                      <button
                        type="button"
                        onClick={startSso}
                        className="ds-button [display:inline-flex] [min-height:52px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:15px] [background:var(--ds-accent)] [color:var(--ds-text-inverse)] [font-weight:600] "
                      >
                        Mit Microsoft anmelden
                        <FiArrowRight className="[width:1rem] [height:1rem]" />
                      </button>
                    ) : (
                      <span className="[display:flex] [min-height:52px] [align-items:center] [justify-content:center] [padding-inline:18px] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-bg-soft)] [color:var(--ds-text-muted)] [font-size:0.85rem] [font-weight:600] [text-align:center]">
                        Microsoft SSO ist nicht konfiguriert
                      </span>
                    )}
                    <Link
                      href="/help"
                      className="[display:inline-flex] [min-height:46px] [align-items:center] [justify-content:center] [color:var(--ds-text-default)] [font-size:0.85rem] [font-weight:600] hover:[color:var(--ds-accent-strong)]"
                    >
                      Hilfe entdecken
                    </Link>
                  </div>
                </div>
              )}
            </aside>
          </section>

          {authChecked && authed ? (
            <section className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] [padding-block:20px_88px]">
              <div className="[display:flex] [align-items:end] [justify-content:space-between] [gap:24px] [margin-bottom:26px] max-[760px]:[align-items:flex-start] max-[760px]:[flex-direction:column]">
                <div>
                  <p className="[margin:0_0_10px] [color:var(--ds-accent-strong)] [font-size:0.72rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                    Alle verfügbaren Roadmaps
                  </p>
                  <h2 className="[margin:0] [color:var(--ds-text-strong)] [font-size:clamp(1.8rem,_3.5vw,_2.6rem)] [font-weight:600] [letter-spacing:-0.05em]">
                    Deine Instanzen
                  </h2>
                </div>
                <p className="[max-width:520px] [margin:0] [color:var(--ds-text-muted)] [font-size:0.9rem] [line-height:1.6]">
                  Es werden ausschließlich Instanzen angezeigt, für die dein Konto freigeschaltet
                  ist.
                </p>
              </div>

              <div className="ds-instance-grid [display:grid] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [gap:18px] max-[1100px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[700px]:[grid-template-columns:1fr]">
                {visibleInstances.map((instance) => (
                  <article
                    key={instance.slug}
                    className="group [position:relative] [display:flex] [min-height:300px] [overflow:hidden] [flex-direction:column] [padding:24px] [border:1px_solid_var(--ds-border-default)] [border-radius:24px] [background:var(--ds-bg-elevated-strong)] [transition:transform_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out)] before:[position:absolute] before:[top:0] before:[right:0] before:[left:0] before:[height:3px] hover:[border-color:var(--ds-border-strong)] "
                  >
                    <div className="[display:flex] [align-items:center] [justify-content:space-between] [gap:16px]">
                      <div className="[display:grid] [width:54px] [height:54px] [place-items:center] [border:1px_solid_var(--ds-border-strong)] [border-radius:17px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]">
                        <FiLayers className="[width:1.35rem] [height:1.35rem]" />
                      </div>
                      <span className="[color:var(--ds-text-muted)] [font-size:0.72rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                        {instance.slug}
                      </span>
                    </div>

                    <h3 className="[margin:22px_0_0] [color:var(--ds-text-strong)] [font-size:1.45rem] [font-weight:600] [letter-spacing:-0.035em] [line-height:1.15]">
                      {instance.displayName}
                    </h3>
                    {instance.description ? (
                      <p className="[margin:11px_0_0] [color:var(--ds-text-default)] [font-size:0.85rem] [line-height:1.6]">
                        {instance.description}
                      </p>
                    ) : null}

                    {instance.department ? (
                      <div className="[display:flex] [flex-wrap:wrap] [gap:8px] [margin-top:16px]">
                        <span className="[display:inline-flex] [align-items:center] [gap:6px] [padding:7px_10px] [border:1px_solid_var(--ds-border-default)] [border-radius:999px] [background:var(--ds-bg-soft)] [color:var(--ds-text-default)] [font-size:0.72rem] [font-weight:600]">
                          <FiMapPin className="[width:0.85rem] [height:0.85rem] [color:var(--ds-accent-strong)]" />
                          {instance.department}
                        </span>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => openInstance(instance)}
                      disabled={selectingSlug !== null}
                      className="[display:inline-flex] [width:100%] [min-height:52px] [align-items:center] [justify-content:space-between] [gap:12px] [margin-top:auto] [padding:12px_16px] [border:1px_solid_transparent] [border-radius:15px] [background:var(--ds-accent)] [color:var(--ds-text-inverse)] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out)] disabled:[cursor:wait] disabled:[opacity:0.6]"
                    >
                      {selectingSlug === instance.slug
                        ? 'Roadmap wird geöffnet ...'
                        : 'Roadmap öffnen'}
                      <FiArrowRight className="[width:1rem] [height:1rem]" />
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
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
                href="/help"
              >
                Hilfe
              </Link>
              <Link
                className="ds-footer-link [color:var(--ds-text-muted)] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
                href="/feedback"
              >
                Feedback
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<LandingPageProps> = async (ctx) => {
  const session = await extractAdminSessionFromHeaders({
    authorization: ctx.req.headers.authorization,
    cookie: ctx.req.headers.cookie,
  });
  const forwardedHeaders = {
    authorization:
      typeof ctx.req.headers.authorization === 'string' ? ctx.req.headers.authorization : undefined,
    cookie: typeof ctx.req.headers.cookie === 'string' ? ctx.req.headers.cookie : undefined,
  };

  const records = await prisma.roadmapInstance.findMany({
    include: { hosts: true },
    orderBy: { displayName: 'asc' },
  });

  if (!session) {
    return {
      props: { instances: [] },
    };
  }

  if (await isDbSuperAdminSession(session)) {
    const instances: LandingInstance[] = records.map((record) => {
      const hosts = record.hosts.map((host) => host.host);
      return {
        slug: record.slug,
        displayName: record.displayName,
        department: record.department ?? null,
        description: record.description ?? null,
        sharePointUrl: (record.sharePointSiteUrlProd || record.sharePointSiteUrlDev).replace(
          /\/$/,
          ''
        ),
        strategy: record.sharePointStrategy || 'kerberos',
        hosts,
        frontendTarget: resolveFrontendTarget(record.settingsJson ?? null, hosts),
        landingPage: record.landingPage ?? null,
      };
    });

    return {
      props: { instances },
    };
  }

  const resolvedDepartment = await resolveSessionDepartmentAcrossInstances({
    session,
    instanceSlugs: records.map((record) => record.slug),
    requestHeaders: forwardedHeaders,
  });

  const checks = await Promise.all(
    records.map(async (r) => {
      try {
        const allowed = await isReadSessionAllowedForInstance({
          session,
          instance: { slug: r.slug },
          requestHeaders: forwardedHeaders,
          knownSuperAdmin: false,
          resolvedDepartment,
          allowSharePointFallback: false,
        });
        return { record: r, allowed };
      } catch {
        return { record: r, allowed: false };
      }
    })
  );

  const filtered = checks.filter((c) => c.allowed).map((c) => c.record);

  const instances: LandingInstance[] = filtered.map((record) => {
    const hosts = record.hosts.map((host) => host.host);
    return {
      slug: record.slug,
      displayName: record.displayName,
      department: record.department ?? null,
      description: record.description ?? null,
      sharePointUrl: (record.sharePointSiteUrlProd || record.sharePointSiteUrlDev).replace(
        /\/$/,
        ''
      ),
      strategy: record.sharePointStrategy || 'kerberos',
      hosts,
      frontendTarget: resolveFrontendTarget(record.settingsJson ?? null, hosts),
      landingPage: record.landingPage ?? null,
    };
  });

  return {
    props: { instances },
  };
};

export default InstancesPage;
