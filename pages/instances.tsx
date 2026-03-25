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
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import JSDoITLoader from '@/components/JSDoITLoader';
import {
  ADMIN_SESSION_CHANGED_EVENT,
  buildInstanceAwareUrl,
  getAdminSessionToken,
  hasValidSuperAdminSession,
  hasValidUserSession,
  persistAdminSession,
} from '@/utils/auth';
import { extractAdminSessionFromHeaders } from '@/utils/apiAuth';
import { isReadSessionAllowedForInstance } from '@/utils/instanceAccessServer';
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

const buildTargetFromHost = (hostValue: string | null, path?: string | null): string | null => {
  if (!hostValue) return null;
  const trimmed = hostValue.trim();
  if (!trimmed) return null;
  const normalizedPath = path ? `/${path.replace(/^\/+/, '')}` : '';
  if (HTTP_URL_REGEX.test(trimmed)) {
    return `${trimmed.replace(/\/$/, '')}${normalizedPath}`;
  }
  if (trimmed.startsWith('//')) {
    return `${trimmed.replace(/\/$/, '')}${normalizedPath}`;
  }
  if (trimmed.startsWith('/')) {
    const base = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
    return `${base}${normalizedPath}`;
  }
  const sanitizedHost = trimmed.replace(/\/+$/, '');
  return `//${sanitizedHost}${normalizedPath}`;
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

  const manual = String(router.query.manual || '') === '1';
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

        const [hasSession, hasSuperAdmin] = await Promise.all([
          hasValidUserSession(),
          hasValidSuperAdminSession(),
        ]);
        if (!cancelled) {
          setAuthed(hasSession);
          setCanManageInstances(hasSuperAdmin);
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
    if (manual) return;

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
  }, [
    router.isReady,
    authChecked,
    authed,
    entraEnabled,
    autoEntraSso,
    manual,
    returnUrl,
    router.query,
  ]);

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
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
        <SiteHeader activeRoute="instances" />
        <main className="flex-1">
          <section className="relative isolate overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_24%),radial-gradient(circle_at_82%_18%,_rgba(251,191,36,0.14),_transparent_20%),linear-gradient(180deg,_#08111f_0%,_#0f172a_52%,_#09111b_100%)]">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:68px_68px]" />
              <div className="absolute left-[10%] top-[-10%] h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" />
              <div className="absolute right-[-10%] top-[20%] h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
              <div className="absolute bottom-[-12%] left-1/3 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
            </div>
            <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-20 sm:px-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:py-24">
              <div className="max-w-3xl space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-200 backdrop-blur">
                  <FiStar className="h-4 w-4" />
                  Instanzübersicht
                </div>

                <div className="space-y-6">
                  <h1 className="text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                    Verbinde dich mit der passenden Roadmap-Instanz
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                    Wähle deine Organisationseinheit, öffne die passende Roadmap und behalte
                    gleichzeitig Zugriff, Herkunft und Betriebsmodell jeder Instanz im Blick.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {authed ? (
                    <button
                      type="button"
                      onClick={() => openInstance(defaultInstance)}
                      disabled={!visibleInstances.length || selectingSlug !== null}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-200 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_rgba(34,211,238,0.22)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_60px_rgba(34,211,238,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {!visibleInstances.length
                        ? 'Keine Instanzen vorhanden'
                        : selectingSlug
                          ? 'Weiterleitung wird vorbereitet ...'
                          : 'Roadmap starten'}
                      {visibleInstances.length ? <FiArrowRight className="h-4 w-4" /> : null}
                    </button>
                  ) : entraEnabled ? (
                    <button
                      type="button"
                      onClick={startSso}
                      className="rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-200 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_rgba(34,211,238,0.22)] transition hover:translate-y-[-1px]"
                    >
                      Mit Microsoft anmelden (SSO)
                    </button>
                  ) : (
                    <Link
                      href={`/admin/login?manual=1&returnUrl=${encodeURIComponent(returnUrl)}`}
                      className="rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-200 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_rgba(34,211,238,0.22)] transition hover:translate-y-[-1px]"
                    >
                      Anmelden
                    </Link>
                  )}
                  <Link
                    href="/help"
                    className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 backdrop-blur transition hover:border-cyan-300/40 hover:bg-white/10"
                  >
                    Hilfe entdecken
                  </Link>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4 backdrop-blur">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
                      Freigegebene Instanzen
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {visibleInstances.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4 backdrop-blur">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
                      Bereiche
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">{departmentCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4 backdrop-blur">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
                      Ziel-Hosts
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">{hostCount}</p>
                  </div>
                </div>
              </div>

              <aside className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-7 shadow-[0_24px_80px_rgba(2,6,23,0.5)] backdrop-blur-xl">
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-200/80">
                        Zugriff & Orientierung
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold text-white">
                        Welche Instanzen du hier erwarten kannst
                      </h2>
                    </div>
                    <div className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 sm:flex">
                      <FiLock className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
                      Nur freigegebene Instanzen werden angezeigt. Rollen und Berechtigungen bleiben
                      aus SharePoint und Admin-Konfiguration ableitbar.
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
                      Jede Karte zeigt Name, Bereich, SharePoint-Ziel und verfügbare Hosts, damit
                      die Auswahl nachvollziehbar bleibt.
                    </div>
                    <div className="rounded-2xl border border-amber-300/15 bg-gradient-to-br from-amber-300/10 via-transparent to-cyan-300/5 p-4 text-sm leading-6 text-slate-200">
                      Der Schnellstart oben öffnet direkt die erste verfügbare Instanz. Einzelne
                      Karten geben dir mehr Kontext vor dem Wechsel.
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="border-b border-white/10 bg-[linear-gradient(180deg,_rgba(15,23,42,0.96)_0%,_rgba(8,15,28,1)_100%)]">
            <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
              <div className="mb-10 max-w-3xl space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                  Warum diese Übersicht hilft
                </p>
                <h2 className="text-2xl font-semibold text-white sm:text-4xl">
                  Orientierung für Teams und Stakeholder
                </h2>
                <p className="text-sm leading-7 text-slate-300">
                  Die Roadmap vereint Status, Aufgaben und Ansprechpersonen. Die folgenden
                  Highlights zeigen, wie du schnell ans Ziel kommst.
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {highlightCards.map((card) => (
                  <article
                    key={card.title}
                    className="group rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-6 shadow-[0_18px_50px_rgba(2,6,23,0.35)] transition hover:border-cyan-300/30 hover:translate-y-[-2px]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300/15 to-amber-200/10 text-cyan-100 ring-1 ring-white/10">
                      <card.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{card.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {!authChecked ? (
            <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
              <div className="flex items-center justify-center">
                <JSDoITLoader sizeRem={2.2} message={authStatus || 'Anmeldung wird geprüft ...'} />
              </div>
            </section>
          ) : authed ? (
            <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                    Auswahlbereich
                  </p>
                  <h2 className="text-2xl font-semibold text-white sm:text-4xl">
                    Aktive Instanzen
                  </h2>
                  <p className="max-w-2xl text-sm leading-7 text-slate-300">
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-medium text-slate-100 backdrop-blur transition hover:border-cyan-300/40 hover:bg-white/10 sm:w-auto"
                  >
                    Instanzen verwalten
                    <FiExternalLink className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>

              {errorMessage && (
                <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-600/10 px-4 py-4 text-sm text-red-200 backdrop-blur">
                  {errorMessage}
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                {visibleInstances.map((instance, index) => (
                  <article
                    key={instance.slug}
                    className="group relative overflow-hidden rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,_rgba(15,23,42,0.82)_0%,_rgba(2,6,23,0.92)_100%)] p-6 shadow-[0_24px_70px_rgba(2,6,23,0.38)] transition hover:border-cyan-300/30 hover:translate-y-[-2px]"
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                      <div className="absolute right-[-10%] top-[-10%] h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
                          Instanz {String(index + 1).padStart(2, '0')}
                        </p>
                        <h3 className="text-xl font-semibold text-white">{instance.displayName}</h3>
                        {instance.department && (
                          <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
                            <FiMapPin className="h-3.5 w-3.5" />
                            {instance.department}
                          </p>
                        )}
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200">
                        {instance.strategy}
                      </span>
                    </div>

                    {instance.description && (
                      <p className="mt-4 text-sm leading-7 text-slate-300">
                        {instance.description}
                      </p>
                    )}

                    <dl className="mt-5 space-y-3 text-xs sm:text-sm">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <div className="flex items-center gap-2 text-slate-400">
                          <FiGlobe className="h-4 w-4 text-cyan-200" />
                          <span className="font-semibold text-slate-200">SharePoint</span>
                        </div>
                        <span className="mt-2 block truncate text-slate-300">
                          {instance.sharePointUrl}
                        </span>
                      </div>
                      {instance.hosts.length > 0 && (
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                          <div className="flex items-center gap-2 text-slate-400">
                            <FiExternalLink className="h-4 w-4 text-cyan-200" />
                            <span className="font-semibold text-slate-200">Hosts</span>
                          </div>
                          <span className="mt-2 block text-slate-300">
                            {instance.hosts.join(', ')}
                          </span>
                        </div>
                      )}
                    </dl>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openInstance(instance)}
                        disabled={selectingSlug === instance.slug}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-200 px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {selectingSlug === instance.slug ? 'Öffne Roadmap ...' : 'Roadmap öffnen'}
                        <FiArrowRight className="h-4 w-4" />
                      </button>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-300">
                        {instance.slug}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {!visibleInstances.length && !instancesLoading && (
                <div className="mt-12 rounded-[2rem] border border-dashed border-white/15 bg-slate-900/70 p-8 text-center text-slate-300">
                  <p className="text-lg font-medium text-white">
                    {canManageInstances
                      ? 'Noch keine Instanzen vorhanden'
                      : 'Keine freigegebenen Instanzen'}
                  </p>
                  <p className="mt-2 text-sm">
                    {canManageInstances
                      ? 'Erstelle in der Instanzverwaltung eine neue Roadmap-Instanz und verknüpfe den passenden SharePoint-Endpunkt.'
                      : 'Dir ist aktuell keine Roadmap-Instanz per Abteilung oder Admin-Berechtigung zugeordnet.'}
                  </p>
                </div>
              )}

              {!visibleInstances.length && instancesLoading && (
                <div className="mt-12 flex items-center justify-center">
                  <JSDoITLoader sizeRem={2} message="Instanzen werden geladen ..." />
                </div>
              )}
            </section>
          ) : (
            <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
              <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,_rgba(15,23,42,0.82)_0%,_rgba(2,6,23,0.92)_100%)] p-8 shadow-[0_30px_90px_rgba(2,6,23,0.45)]">
                <div className="max-w-2xl space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                    Anmeldung erforderlich
                  </p>
                  <h2 className="text-2xl font-semibold text-white sm:text-4xl">
                    Instanzzugriff freischalten
                  </h2>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                  Die Instanzübersicht ist erst nach Anmeldung sichtbar.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {entraEnabled ? (
                    <button
                      type="button"
                      onClick={startSso}
                      className="rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-200 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_rgba(34,211,238,0.22)] transition hover:translate-y-[-1px]"
                    >
                      Mit Microsoft anmelden (SSO)
                    </button>
                  ) : (
                    <Link
                      href={`/admin/login?manual=1&returnUrl=${encodeURIComponent(returnUrl)}`}
                      className="rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-200 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_rgba(34,211,238,0.22)] transition hover:translate-y-[-1px]"
                    >
                      Anmelden
                    </Link>
                  )}
                  <Link
                    href={`/admin/login?manual=1&returnUrl=${encodeURIComponent(returnUrl)}`}
                    className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 backdrop-blur transition hover:border-cyan-300/40 hover:bg-white/10"
                  >
                    Alternative Anmeldung
                  </Link>
                </div>
              </div>
            </section>
          )}
        </main>
        <SiteFooter />
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

  const checks = await Promise.all(
    records.map(async (r) => {
      try {
        const allowed = await isReadSessionAllowedForInstance({
          session,
          instance: { slug: r.slug },
          requestHeaders: forwardedHeaders,
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
