import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { useMemo, useState } from 'react';
import prisma from '@/lib/prisma';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';

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
    description:
      'Visualisiere Initiativen, Status und Verantwortliche in einer konsistenten Roadmap für alle Teams.',
  },
  {
    title: 'Vertrauenswürdige Datenquelle',
    description:
      'Die Roadmap synchronisiert sich direkt mit SharePoint. Berechtigungen und Rollen bleiben erhalten.',
  },
  {
    title: 'Gemeinsame Steuerung',
    description:
      'Stakeholder, Projektleitungen und Management finden auf einen Blick Kennzahlen und nächste Schritte.',
  },
];

const LandingPage = ({ instances }: LandingPageProps) => {
  const [selectingSlug, setSelectingSlug] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const defaultInstance = useMemo(() => instances[0], [instances]);

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

  const openInstance = async (instance?: LandingInstance) => {
    if (typeof window === 'undefined' || !instance?.slug) return;
    setSelectingSlug(instance.slug);
    setErrorMessage(null);
    try {
      const resp = await fetch('/api/instances/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: instance.slug }),
      });
      if (!resp.ok) {
        const payload = await resp.json().catch(() => null);
        throw new Error(payload?.error || `Fehler ${resp.status}`);
      }
      const redirectTarget = buildClientRedirectUrl(instance.frontendTarget) || '/roadmap';
      window.location.href = redirectTarget;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setErrorMessage(message);
      setSelectingSlug(null);
    }
  };

  return (
    <>
      <Head>
        <title>JSDoIT Roadmap Center</title>
      </Head>
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
        <SiteHeader activeRoute="home" />
        <main className="flex-1">
          <section className="relative isolate overflow-hidden border-b border-slate-800/70">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute left-1/3 top-[-20%] h-80 w-80 rounded-full bg-sky-500/40 blur-3xl" />
              <div className="absolute right-[-10%] top-1/2 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
            </div>
            <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-20 sm:px-8 lg:flex-row lg:items-center">
              <div className="max-w-2xl space-y-6">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-sky-300/90">
                  Roadmap Control Center
                </p>
                <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                  Eine gemeinsame Roadmap für alle Projekte im Kanton
                </h1>
                <p className="text-base text-slate-300 sm:text-lg">
                  Willkommen in der zentralen Übersicht für Roadmap-Instanzen. Wähle deine
                  Organisationseinheit, starte direkt in die passende Roadmap oder informiere dich,
                  welche Verantwortlichen bereits aktiv sind.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => openInstance(defaultInstance)}
                    disabled={!instances.length || selectingSlug !== null}
                    className="rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {!instances.length
                      ? 'Keine Instanzen vorhanden'
                      : selectingSlug
                        ? 'Weiterleitung wird vorbereitet …'
                        : 'Roadmap starten'}
                  </button>
                  <Link
                    href="/help"
                    className="rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
                  >
                    Hilfe entdecken
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section className="border-b border-slate-800/70 bg-slate-950/70">
            <div className="mx-auto max-w-6xl px-6 py-14 sm:px-8">
              <div className="mb-10 max-w-3xl space-y-4">
                <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                  Orientierung für Teams und Stakeholder
                </h2>
                <p className="text-sm text-slate-300">
                  Die Roadmap vereint Status, Aufgaben und Ansprechpersonen. Die folgenden
                  Highlights zeigen, wie du schnell ans Ziel kommst.
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {highlightCards.map((card) => (
                  <article
                    key={card.title}
                    className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40 transition hover:border-sky-500/60 hover:shadow-sky-900/40"
                  >
                    <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                    <p className="mt-3 text-sm text-slate-300">{card.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-white sm:text-3xl">Aktive Instanzen</h2>
                <p className="text-sm text-slate-300">
                  {instances.length
                    ? 'Wähle eine Instanz, um dich mit der passenden Roadmap zu verbinden.'
                    : 'Noch keine Instanzen angelegt. Lege die erste im Adminbereich an.'}
                </p>
              </div>
              <Link
                href="/admin/instances"
                className="w-full rounded-full border border-slate-700 px-5 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-400 hover:text-white sm:w-auto"
              >
                Instanzen verwalten
              </Link>
            </div>

            {errorMessage && (
              <div className="mb-6 rounded-xl border border-red-500/40 bg-red-600/10 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {instances.map((instance) => (
                <article
                  key={instance.slug}
                  className="group rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow shadow-slate-950/40 transition hover:border-sky-500/50 hover:shadow-sky-900/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{instance.displayName}</h3>
                      {instance.department && (
                        <p className="text-sm text-sky-300/90">{instance.department}</p>
                      )}
                    </div>
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                      {instance.strategy}
                    </span>
                  </div>

                  {instance.description && (
                    <p className="mt-4 text-sm text-slate-300">{instance.description}</p>
                  )}

                  <dl className="mt-4 space-y-2 text-xs sm:text-sm">
                    <div className="flex gap-2 text-slate-400">
                      <span className="font-semibold text-slate-200">SharePoint</span>
                      <span className="truncate text-slate-300">{instance.sharePointUrl}</span>
                    </div>
                    {instance.hosts.length > 0 && (
                      <div className="flex gap-2 text-slate-400">
                        <span className="font-semibold text-slate-200">Hosts</span>
                        <span>{instance.hosts.join(', ')}</span>
                      </div>
                    )}
                  </dl>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openInstance(instance)}
                      disabled={selectingSlug === instance.slug}
                      className="flex-1 rounded-xl bg-sky-500 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {selectingSlug === instance.slug ? 'Öffne Roadmap …' : 'Roadmap öffnen'}
                    </button>
                    <div className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                      {instance.slug}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {!instances.length && (
              <div className="mt-12 rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/70 p-8 text-center text-slate-300">
                <p className="text-lg font-medium text-white">Noch keine Instanzen vorhanden</p>
                <p className="mt-2 text-sm">
                  Erstelle im Adminbereich eine neue Roadmap-Instanz und verknüpfe den passenden
                  SharePoint-Endpunkt.
                </p>
              </div>
            )}
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<LandingPageProps> = async () => {
  const records = await prisma.roadmapInstance.findMany({
    include: { hosts: true },
    orderBy: { displayName: 'asc' },
  });

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
      strategy: record.sharePointStrategy || 'onprem',
      hosts,
      frontendTarget: resolveFrontendTarget(record.settingsJson ?? null, hosts),
      landingPage: record.landingPage ?? null,
    };
  });

  return {
    props: { instances },
  };
};

export default LandingPage;
