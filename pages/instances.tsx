import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  FiArrowRight,
  FiCompass,
  FiExternalLink,
  FiGlobe,
  FiLayers,
  FiLock,
  FiMapPin,
  FiShield,
  FiStar,
} from 'react-icons/fi';
import prisma from '@/lib/prisma';
import ColorModeToggle from '@/components/ColorModeToggle';
import JSDoITLoader from '@/components/JSDoITLoader';
import {
  ADMIN_SESSION_CHANGED_EVENT,
  buildInstanceAwareUrl,
  getAdminSessionToken,
  getAdminSessionState,
  persistAdminSession,
} from '@/utils/auth';
import { extractAdminSessionFromHeaders } from '@/utils/apiAuth';
import {
  isReadSessionAllowedForInstance,
  resolveSessionDepartmentAcrossInstances,
} from '@/utils/instanceAccessServer';
import { isSuperAdminSessionWithSharePointFallback } from '@/utils/superAdminAccessServer';

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

const highlightCards = [
  {
    title: 'Klarer Projektüberblick',
    icon: FiLayers,
    description:
      'Visualisiere Initiativen, Status und Verantwortliche in einer konsistenten Roadmap für alle Teams.',
  },
  {
    title: 'Vertrauenswürdige Datenquelle',
    icon: FiShield,
    description:
      'Die Roadmap synchronisiert sich direkt mit SharePoint. Berechtigungen und Rollen bleiben erhalten.',
  },
  {
    title: 'Gemeinsame Steuerung',
    icon: FiCompass,
    description:
      'Stakeholder, Projektleitungen und Management finden auf einen Blick Kennzahlen und nächste Schritte.',
  },
];

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

  const defaultInstance = useMemo(() => visibleInstances[0], [visibleInstances]);
  const departmentCount = useMemo(
    () => new Set(visibleInstances.map((instance) => instance.department).filter(Boolean)).size,
    [visibleInstances]
  );
  const hostCount = useMemo(
    () => new Set(visibleInstances.flatMap((instance) => instance.hosts)).size,
    [visibleInstances]
  );

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
    if (typeof window === 'undefined') return;
    try {
      const hash = window.location.hash || '';
      if (!hash.startsWith('#')) return;
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('token');
      const u = params.get('username');
      if (!token) return;

      persistAdminSession(token, u || 'Microsoft SSO');
      try {
        const cleanUrl = window.location.pathname + window.location.search;
        window.history.replaceState(null, document.title, cleanUrl);
        window.location.replace(cleanUrl);
        return;
      } catch {
        window.location.hash = '';
      }
      setAuthStatus('Anmeldung erfolgreich. Lade Instanzen ...');
      window.location.reload();
    } catch {
      // ignore
    }
  }, [router.isReady, returnUrl]);

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
      const token = getAdminSessionToken();
      if (!token) return;
      setInstancesLoading(true);
      try {
        const resp = await fetch(buildInstanceAwareUrl('/api/instances/slugs?details=landing'), {
          headers: { Authorization: `Bearer ${token}` },
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

      const token = getAdminSessionToken();
      if (token) {
        try {
          await fetch('/api/instances/select', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ slug: instance.slug }),
          });
        } catch {
          // ignore and continue with client-side redirect + cookie fallback
        }
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
      <div className="ds-page-shell">
        <header className="ds-topbar">
          <Link className="ds-brand" href="/landing">
            <span className="ds-brand-mark">JS</span>
            <span className="ds-brand-name">JSDOIT Roadmap Center</span>
          </Link>

          <nav className="ds-nav" aria-label="Hauptnavigation">
            <Link className="ds-nav-link" href="/landing">
              Start
            </Link>
            <Link className="ds-nav-link is-active" href="/instances">
              Instanzübersicht
            </Link>
            <Link className="ds-nav-link" href="/help">
              Hilfe
            </Link>
            {authed && (
              <Link className="ds-nav-link" href="/feedback">
                Feedback
              </Link>
            )}
          </nav>

          <ColorModeToggle className="ds-color-mode-toggle" />
        </header>

        <main className="ds-page-main">
          <section className="ds-container ds-hero ds-instance-hero">
            <div className="ds-hero-content">
              <div className="ds-eyebrow">
                <FiStar className="ds-icon-sm" />
                Instanzübersicht
              </div>

              <h1 className="ds-hero-title">
                Verbinde dich mit der passenden{' '}
                <span className="ds-accent-text">Roadmap-Instanz</span>
              </h1>
              <p className="ds-hero-copy">
                Wähle deine Organisationseinheit, öffne die passende Roadmap und behalte
                gleichzeitig Zugriff, Herkunft und Betriebsmodell jeder Instanz im Blick.
              </p>

              <div className="ds-actions">
                {authed ? (
                  <button
                    type="button"
                    onClick={() => openInstance(defaultInstance)}
                    disabled={!visibleInstances.length || selectingSlug !== null}
                    className="ds-button ds-button-primary"
                  >
                    {!visibleInstances.length
                      ? 'Keine Instanzen vorhanden'
                      : selectingSlug
                        ? 'Weiterleitung wird vorbereitet ...'
                        : 'Roadmap starten'}
                    {visibleInstances.length ? <FiArrowRight className="ds-icon-sm" /> : null}
                  </button>
                ) : entraEnabled ? (
                  <button type="button" onClick={startSso} className="ds-button ds-button-primary">
                    Anmelden
                  </button>
                ) : (
                  <span className="ds-button ds-button-secondary ds-button-disabled">
                    Microsoft SSO ist nicht konfiguriert
                  </span>
                )}
                <Link href="/help" className="ds-button ds-button-secondary">
                  Hilfe entdecken
                </Link>
              </div>
            </div>

            <aside className="ds-card ds-logic-panel" aria-label="Zugriff und Orientierung">
              <div className="ds-panel-header">
                <div>
                  <p className="ds-panel-label">Zugriff & Orientierung</p>
                  <h2 className="ds-panel-title">Welche Instanzen du hier erwarten kannst</h2>
                </div>
                <div className="ds-panel-icon" aria-hidden="true">
                  <FiLock className="ds-icon-md" />
                </div>
              </div>

              <div className="ds-info-list">
                <p className="ds-info-item">
                  Nur freigegebene Instanzen werden angezeigt. Rollen und Berechtigungen bleiben aus
                  SharePoint und Admin-Konfiguration ableitbar.
                </p>
                <p className="ds-info-item">
                  Jede Karte zeigt Name, Bereich, SharePoint-Ziel und verfügbare Hosts, damit die
                  Auswahl nachvollziehbar bleibt.
                </p>
                <p className="ds-note ds-info-note">
                  Der Schnellstart oben öffnet direkt die erste verfügbare Instanz. Einzelne Karten
                  geben dir mehr Kontext vor dem Wechsel.
                </p>
              </div>
            </aside>
          </section>

          <section className="ds-container ds-section">
            <div className="ds-section-header">
              <div>
                <p className="ds-panel-label">Warum diese Übersicht hilft</p>
                <h2 className="ds-section-title">Orientierung für Teams und Stakeholder</h2>
              </div>
              <p className="ds-section-copy">
                Die Roadmap vereint Status, Aufgaben und Ansprechpersonen. Die folgenden Highlights
                zeigen, wie du schnell ans Ziel kommst.
              </p>
            </div>
            <div className="ds-value-grid">
              {highlightCards.map((card) => (
                <article key={card.title} className="ds-card ds-value-card">
                  <div className="ds-value-icon">
                    <card.icon className="ds-icon" />
                  </div>
                  <h3 className="ds-value-title">{card.title}</h3>
                  <p className="ds-value-copy">{card.description}</p>
                </article>
              ))}
            </div>
          </section>

          {!authChecked ? (
            <section className="ds-container ds-section">
              <div className="ds-centered-state">
                <JSDoITLoader sizeRem={2.2} message={authStatus || 'Anmeldung wird geprüft ...'} />
              </div>
            </section>
          ) : authed ? (
            <section className="ds-container ds-section">
              <div className="ds-section-header">
                <div>
                  <p className="ds-panel-label">Auswahlbereich</p>
                  <h2 className="ds-section-title">Aktive Instanzen</h2>
                  <p className="ds-section-copy">
                    {visibleInstances.length
                      ? 'Wähle eine Instanz, um dich mit der passenden Roadmap zu verbinden.'
                      : canManageInstances
                        ? 'Noch keine Instanzen angelegt. Lege die erste in der Instanzverwaltung an.'
                        : 'Für dein Konto ist aktuell keine Roadmap-Instanz freigegeben.'}
                  </p>
                </div>
                {canManageInstances ? (
                  <Link
                    href="/admin/instances"
                    className="ds-button ds-button-secondary ds-section-action"
                  >
                    Instanzen verwalten
                    <FiExternalLink className="ds-icon-sm" />
                  </Link>
                ) : null}
              </div>

              {errorMessage && <div className="ds-message ds-message-danger">{errorMessage}</div>}

              <div className="ds-instance-grid">
                {visibleInstances.map((instance, index) => (
                  <article key={instance.slug} className="ds-card ds-instance-card">
                    <div className="ds-instance-card-header">
                      <div>
                        <p className="ds-kicker">Instanz {String(index + 1).padStart(2, '0')}</p>
                        <h3 className="ds-instance-title">{instance.displayName}</h3>
                        {instance.department && (
                          <p className="ds-badge ds-instance-department">
                            <FiMapPin className="ds-icon-sm" />
                            {instance.department}
                          </p>
                        )}
                      </div>
                      <span className="ds-badge">{instance.strategy}</span>
                    </div>

                    {instance.description && (
                      <p className="ds-instance-description">{instance.description}</p>
                    )}

                    <dl className="ds-instance-details">
                      <div className="ds-instance-detail">
                        <div className="ds-instance-detail-label">
                          <FiGlobe className="ds-icon-sm" />
                          <span>SharePoint</span>
                        </div>
                        <dd className="ds-instance-detail-value">{instance.sharePointUrl}</dd>
                      </div>
                      {instance.hosts.length > 0 && (
                        <div className="ds-instance-detail">
                          <div className="ds-instance-detail-label">
                            <FiExternalLink className="ds-icon-sm" />
                            <span>Hosts</span>
                          </div>
                          <dd className="ds-instance-detail-value">{instance.hosts.join(', ')}</dd>
                        </div>
                      )}
                    </dl>

                    <div className="ds-instance-actions">
                      <button
                        type="button"
                        onClick={() => openInstance(instance)}
                        disabled={selectingSlug === instance.slug}
                        className="ds-button ds-button-primary ds-instance-open"
                      >
                        {selectingSlug === instance.slug ? 'Öffne Roadmap ...' : 'Roadmap öffnen'}
                        <FiArrowRight className="ds-icon-sm" />
                      </button>
                      <div className="ds-instance-slug">{instance.slug}</div>
                    </div>
                  </article>
                ))}
              </div>

              {!visibleInstances.length && !instancesLoading && (
                <div className="ds-empty-state">
                  <p className="ds-empty-title">
                    {canManageInstances
                      ? 'Noch keine Instanzen vorhanden'
                      : 'Keine freigegebenen Instanzen'}
                  </p>
                  <p className="ds-empty-copy">
                    {canManageInstances
                      ? 'Erstelle in der Instanzverwaltung eine neue Roadmap-Instanz und verknüpfe den passenden SharePoint-Endpunkt.'
                      : 'Dir ist aktuell keine Roadmap-Instanz über die explizit freigegebenen Abteilungen zugeordnet.'}
                  </p>
                </div>
              )}

              {!visibleInstances.length && instancesLoading && (
                <div className="ds-centered-state">
                  <JSDoITLoader sizeRem={2} message="Instanzen werden geladen ..." />
                </div>
              )}
            </section>
          ) : (
            <section className="ds-container ds-section">
              <div className="ds-card ds-auth-panel">
                <div>
                  <p className="ds-panel-label">Anmeldung erforderlich</p>
                  <h2 className="ds-section-title">Instanzzugriff freischalten</h2>
                </div>
                <p className="ds-section-copy">
                  Die Instanzübersicht ist erst nach Anmeldung sichtbar.
                </p>
                <div className="ds-actions">
                  {entraEnabled ? (
                    <button
                      type="button"
                      onClick={startSso}
                      className="ds-button ds-button-primary"
                    >
                      Anmelden
                    </button>
                  ) : (
                    <span className="ds-button ds-button-secondary ds-button-disabled">
                      Microsoft SSO ist nicht konfiguriert
                    </span>
                  )}
                </div>
              </div>
            </section>
          )}
        </main>

        <footer className="ds-footer">
          <div className="ds-container ds-footer-inner">
            <span>JSDoIT Roadmap Center</span>
            <div className="ds-footer-links">
              <Link className="ds-footer-link" href="/landing">
                Start
              </Link>
              <Link className="ds-footer-link" href="/help">
                Hilfe
              </Link>
              <Link className="ds-footer-link" href="/feedback">
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
  const session = extractAdminSessionFromHeaders({
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

  if (await isSuperAdminSessionWithSharePointFallback(session)) {
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
