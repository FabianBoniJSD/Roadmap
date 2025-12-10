import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetStaticPaths, GetStaticProps } from 'next';
import prisma from '@/lib/prisma';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';

type LandingPreset = {
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  sharePointUrl: string;
};

type LandingInstanceData = {
  slug: string;
  displayName: string;
  department: string | null;
  description: string | null;
  sharePointUrl: string;
  frontendTarget: string | null;
};

type LandingPageProps = {
  slug: string;
  preset: LandingPreset | null;
  instance: LandingInstanceData | null;
};

const LANDING_PAGE_PRESETS: Record<string, LandingPreset> = {
  'jsd-projekte': {
    title: 'Roadmap Justiz- und Sicherheitsdepartement',
    subtitle: 'Strategische Initiativen im Überblick',
    description:
      'Transparenz über alle laufenden Vorhaben des Justiz- und Sicherheitsdepartements. Planungsstände, Abhängigkeiten und Verantwortlichkeiten auf einer Seite.',
    highlights: [
      'Quartals- und Monatsplanung für alle Projekte',
      'Filter nach Kategorien, Status und verantwortlichen Teams',
      'Direkte Links zu SharePoint-Dokumenten und Ansprechpartnern',
    ],
    sharePointUrl: 'https://spi.intranet.bs.ch/jsd/Projekte',
  },
  'bdm-projekte': {
    title: 'Roadmap Bau- und Verkehrsdepartement (BDM)',
    subtitle: 'Projekte koordinieren und priorisieren',
    description:
      'Alle digitalen und organisatorischen Initiativen des BDM auf einen Blick. Nutzen Sie die Roadmap, um Absprachen zu erleichtern und Fortschritte zu verfolgen.',
    highlights: [
      'Aktuelle Roadmap inklusive Budget- und Statusinformationen',
      'Einheitliche Sicht für Projektleitungen und Steuerungsgremien',
      'Einbindung der betrieblichen Teams über SharePoint Links',
    ],
    sharePointUrl: 'https://spi.intranet.bs.ch/bdm/Projekte',
  },
  'kapo-projekte': {
    title: 'Roadmap Kantonspolizei Basel-Stadt',
    subtitle: 'Digitale Einsatz- und Verwaltungsprojekte',
    description:
      'Vom Pilot bis zum Roll-out: Die Roadmap der Kantonspolizei zeigt, welche Projekte die Einsatzfähigkeit und Zusammenarbeit verbessern.',
    highlights: [
      'Statusmeldungen für alle Roadmap-Initiativen',
      'Schwerpunkt: operative Digitalisierung und Infrastruktur',
      'Transparente Kommunikation gegenüber Führung und Teams',
    ],
    sharePointUrl: 'https://spi.intranet.bs.ch/kapo/Projekte',
  },
  'jsd-it-projekte': {
    title: 'Roadmap IT + Digital (JSD)',
    subtitle: 'Technologische Meilensteine planen',
    description:
      'Die IT + Digital Roadmap bündelt technische Projekte, Plattform-Updates und Integrationen des Justiz- und Sicherheitsdepartements.',
    highlights: [
      'Priorisierte Roadmap für IT- und Digitalinitiativen',
      'Synchronisation mit Fachbereichen und Betrieb',
      'Direkter Zugang zu Dokumentation und Ansprechpartnern',
    ],
    sharePointUrl: 'https://spi.intranet.bs.ch/jsd/it/Projekte',
  },
  'jsd-stab-projekte': {
    title: 'Roadmap Stab JSD',
    subtitle: 'Koordination und Steuerung',
    description:
      'Der Stab des Justiz- und Sicherheitsdepartements begleitet alle Projekte mit zentraler Bedeutung. Nutzen Sie die Roadmap als Lagebild.',
    highlights: [
      'Transparenz für Leitung und Stabsbereiche',
      'Projektfortschritt und nächste Meilensteine im Blick',
      'Verzahnung mit Programmen der übrigen Organisationseinheiten',
    ],
    sharePointUrl: 'https://spi.intranet.bs.ch/jsd/Stab/Projekte',
  },
};

const isRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
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

const parseMetadata = (settingsJson?: string | null): Record<string, unknown> | undefined => {
  if (!settingsJson) return undefined;
  try {
    const parsed = JSON.parse(settingsJson);
    return isRecord(parsed?.metadata) || isRecord(parsed) || undefined;
  } catch {
    return undefined;
  }
};

const buildTargetFromHost = (hostValue: string | null, path?: string | null): string | null => {
  if (!hostValue) return null;
  const trimmedHost = hostValue.replace(/^\s+|\s+$/g, '');
  if (!trimmedHost) return null;
  const protocolMatch = /^https?:\/\//i.test(trimmedHost);
  const host = protocolMatch ? trimmedHost : `https://${trimmedHost}`;
  if (!path) return host;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${host}${path}`;
  return `${host}/${path}`;
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

const LandingPage = ({ slug, preset, instance }: LandingPageProps) => {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = instance?.displayName ?? preset?.title ?? 'Roadmap Übersicht';
  const subtitle =
    instance?.department ?? preset?.subtitle ?? 'Gemeinsame Planung und Transparenz schaffen';
  const description =
    instance?.description ??
    preset?.description ??
    'Die Roadmap bündelt Projekte, macht Fortschritte sichtbar und erleichtert die Abstimmung zwischen allen Beteiligten.';
  const sharePointUrl = preset?.sharePointUrl ?? instance?.sharePointUrl ?? null;
  const highlights = preset?.highlights ?? [
    'Projekte nach Status, Zeitraum und Kategorie filtern',
    'Aktuelle Fortschrittsmeldungen im Team teilen',
    'Direkter Zugriff auf Dokumente und Ansprechpartner',
  ];

  const redirectTarget = instance?.frontendTarget ?? null;

  const handleStart = async () => {
    if (!instance) return;
    try {
      setStarting(true);
      setError(null);
      const resp = await fetch('/api/instances/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: instance.slug }),
      });
      if (!resp.ok) {
        const payload = await resp.json().catch(() => null);
        throw new Error(payload?.error || `Fehler ${resp.status}`);
      }
      const target = redirectTarget || '/roadmap';
      window.location.href = target;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
      setStarting(false);
    }
  };

  return (
    <>
      <Head>
        <title>{`${title} | Roadmap Landing`}</title>
      </Head>
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
        <SiteHeader />
        <main className="flex-1">
          <section className="relative overflow-hidden border-b border-slate-800/70">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-[5%] top-[-18%] h-72 w-72 rounded-full bg-sky-500/30 blur-3xl" />
              <div className="absolute right-[-12%] top-1/2 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" />
            </div>
            <div className="relative mx-auto flex max-w-5xl flex-col gap-10 px-6 py-20 sm:px-8 lg:flex-row lg:items-center">
              <div className="max-w-2xl space-y-5">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300/80">
                  Roadmap Landing
                </p>
                <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                  {title}
                </h1>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
                  {subtitle}
                </p>
                <p className="text-base text-slate-300 sm:text-lg">{description}</p>
                <div className="flex flex-wrap items-center gap-3">
                  {instance && (
                    <button
                      type="button"
                      onClick={handleStart}
                      disabled={starting}
                      className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {starting ? 'Weiterleitung …' : 'Roadmap starten'}
                    </button>
                  )}
                  <Link
                    href="/feedback"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
                  >
                    Feedback geben
                  </Link>
                  <Link
                    href="/support"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
                  >
                    Support kontaktieren
                  </Link>
                </div>
                {error && (
                  <p className="text-sm text-rose-300">
                    Fehler bei der Weiterleitung: <span className="font-medium">{error}</span>
                  </p>
                )}
              </div>
              <div className="flex-1 space-y-4 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/40">
                <h2 className="text-lg font-semibold text-white sm:text-xl">
                  Was erwartet Sie in der Roadmap?
                </h2>
                <ul className="space-y-3 text-sm text-slate-300">
                  {highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-3">
                      <span
                        className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
                {sharePointUrl && (
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 text-xs text-slate-400">
                    <p className="font-semibold text-slate-200">SharePoint Bereich</p>
                    <a
                      href={sharePointUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-sky-300 underline decoration-dotted underline-offset-4 transition hover:text-white"
                    >
                      {sharePointUrl}
                    </a>
                    <p className="mt-2">
                      Hier finden Sie ergänzende Informationen, Dokumente und Ansprechpartner.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-5xl px-6 py-12 sm:px-8 lg:py-16">
            <div className="grid gap-6 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/40 sm:grid-cols-[1.1fr_0.9fr] sm:p-8">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white sm:text-xl">Nächste Schritte</h2>
                <p className="text-sm text-slate-300 sm:text-base">
                  Starten Sie die Roadmap, um Projekte zu filtern, Detailansichten zu öffnen und
                  Fortschritte zu teilen. Über Feedback und Support stehen wir für Rückfragen zur
                  Verfügung.
                </p>
              </div>
              <div className="space-y-3 text-sm text-slate-300">
                <p>
                  <span className="font-semibold text-slate-100">Kontakt:</span>{' '}
                  <a
                    href="mailto:roadmap@jsd.bs.ch"
                    className="text-sky-300 underline decoration-dotted underline-offset-4 transition hover:text-white"
                  >
                    roadmap@jsd.bs.ch
                  </a>
                </p>
                {instance && (
                  <p>
                    <span className="font-semibold text-slate-100">Instanz:</span>{' '}
                    <span className="text-slate-200">{instance.slug}</span>
                  </p>
                )}
                <p>
                  <span className="font-semibold text-slate-100">Landing Page:</span>{' '}
                  <span className="text-slate-200">/landing/{slug}</span>
                </p>
              </div>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  const presetSlugs = Object.keys(LANDING_PAGE_PRESETS);
  return {
    paths: presetSlugs.map((slug) => ({ params: { slug } })),
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps<LandingPageProps> = async ({ params }) => {
  const slugParam = params?.slug;
  const slug =
    typeof slugParam === 'string' ? slugParam : Array.isArray(slugParam) ? slugParam[0] : null;
  if (!slug) {
    return { notFound: true };
  }

  const record = await prisma.roadmapInstance.findFirst({
    where: { landingPage: slug },
    include: { hosts: true },
  });

  const instance: LandingInstanceData | null = record
    ? {
        slug: record.slug,
        displayName: record.displayName,
        department: record.department ?? null,
        description: record.description ?? null,
        sharePointUrl: (record.sharePointSiteUrlProd || record.sharePointSiteUrlDev).replace(
          /\/$/,
          ''
        ),
        frontendTarget: resolveFrontendTarget(
          record.settingsJson ?? null,
          record.hosts.map((host) => host.host)
        ),
      }
    : null;

  const preset = LANDING_PAGE_PRESETS[slug] ?? null;

  if (!instance && !preset) {
    return { notFound: true };
  }

  return {
    props: {
      slug,
      preset,
      instance,
    },
    revalidate: 60,
  };
};

export default LandingPage;
