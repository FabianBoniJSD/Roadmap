import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { useState } from 'react';
import prisma from '@/lib/prisma';

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

const LandingPage = ({ instances }: LandingPageProps) => {
  const [selectingSlug, setSelectingSlug] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        <title>Roadmap Übersicht</title>
      </Head>
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="relative isolate overflow-hidden bg-gradient-to-br from-sky-900 via-slate-900 to-slate-950">
          <div className="mx-auto max-w-6xl px-6 pt-24 pb-16 sm:px-10">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-300">
                Roadmap Control Center
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
                Alle Roadmap-Instanzen im Überblick
              </h1>
              <p className="mt-6 text-lg text-slate-200">
                Wähle das gewünschte Department aus, starte direkt die passende Roadmap oder wechsle
                den SharePoint-Endpunkt – ganz ohne erneuten Login.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => openInstance(instances[0])}
                  disabled={!instances.length || selectingSlug !== null}
                  className="rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {!instances.length
                    ? 'Keine Instanzen vorhanden'
                    : selectingSlug
                      ? 'Weiterleiten …'
                      : 'Schnellstart'}
                </button>
                <Link
                  href="/admin/login"
                  className="rounded-full border border-slate-500 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
                >
                  Admin Login
                </Link>
              </div>
            </div>
          </div>
        </div>

        <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
          <div className="mb-10 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">Aktive Instanzen</h2>
              <p className="text-sm text-slate-400">
                {instances.length
                  ? 'Klicke auf eine Karte um die Roadmap zu öffnen.'
                  : 'Noch keine Instanzen angelegt. Bitte im Admin-Bereich hinzufügen.'}
              </p>
            </div>
            <Link
              href="/admin/instances"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-400 hover:text-white"
            >
              Instanzen verwalten
            </Link>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            {instances.map((instance) => (
              <article
                key={instance.slug}
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40 transition hover:border-sky-500/60 hover:shadow-sky-900/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{instance.displayName}</h3>
                    {instance.department && (
                      <p className="text-sm text-sky-300">{instance.department}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                    {instance.strategy}
                  </span>
                </div>
                {instance.description && (
                  <p className="mt-4 text-sm text-slate-300">{instance.description}</p>
                )}
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="font-semibold text-slate-200">SharePoint:</span>
                    <span className="truncate text-slate-300">{instance.sharePointUrl}</span>
                  </div>
                  {instance.hosts.length > 0 && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="font-semibold text-slate-200">Hosts:</span>
                      <span>{instance.hosts.join(', ')}</span>
                    </div>
                  )}
                </dl>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => openInstance(instance)}
                    disabled={selectingSlug === instance.slug}
                    className="flex-1 rounded-xl bg-sky-500 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {selectingSlug === instance.slug ? 'Öffne Roadmap …' : 'Öffnen'}
                  </button>
                  <div className="rounded-xl border border-slate-800 px-3 py-2 text-xs uppercase tracking-wide text-slate-400">
                    {instance.slug}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {!instances.length && (
            <div className="mt-12 rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-300">
              <p className="text-lg font-medium text-white">Keine Instanzen vorhanden</p>
              <p className="mt-2 text-sm">
                Lege die erste Instanz im Admin-Bereich an und verknüpfe deinen SharePoint-Endpunkt.
              </p>
            </div>
          )}
        </section>
      </main>
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
    };
  });

  return {
    props: { instances },
  };
};

export default LandingPage;
