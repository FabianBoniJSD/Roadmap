import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState, type FC, type ReactNode } from 'react';
import type { GetServerSideProps } from 'next';
import { FiArrowLeft, FiExternalLink, FiInfo } from 'react-icons/fi';
import JSDoITLoader from '@/components/JSDoITLoader';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { Project, TeamMember } from '@/types';
import { hasAdminAccess } from '@/utils/auth';
import { INSTANCE_QUERY_PARAM } from '@/utils/instanceConfig';
import { extractAdminSessionFromHeaders } from '@/utils/apiAuth';
import { setInstanceCookieHeader } from '@/utils/instanceConfig';
import { isAdminSessionAllowedForInstance } from '@/utils/instanceAccessServer';
import {
  resolveFirstAllowedInstanceForAdminSession,
  resolveInstanceForAdminSession,
} from '@/utils/instanceSelection';

const statusStyles: Record<string, string> = {
  completed: 'border border-emerald-500/50 bg-emerald-500/15 text-emerald-200',
  'in-progress': 'border border-sky-500/50 bg-sky-500/15 text-sky-200',
  planned: 'border border-slate-600 bg-slate-700/30 text-slate-200',
  paused: 'border border-amber-500/60 bg-amber-500/15 text-amber-200',
  cancelled: 'border border-rose-500/60 bg-rose-500/15 text-rose-200',
};

const statusLabels: Record<string, string> = {
  completed: 'Abgeschlossen',
  'in-progress': 'In Umsetzung',
  planned: 'Geplant',
  paused: 'Pausiert',
  cancelled: 'Gestoppt',
};

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }
  return parsed.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const sanitizeProjectFields = (raw?: string | string[] | null): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => (typeof entry === 'string' ? entry.trim() : `${entry}`.trim()))
      .filter(Boolean);
  }
  return raw
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const PageShell: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
    <SiteHeader activeRoute="roadmap" />
    {children}
    <SiteFooter />
  </div>
);

const ProjectDetailPage: FC<{ accessDenied?: boolean }> = ({ accessDenied }) => {
  const router = useRouter();
  const { id } = router.query;

  const instanceSlug = useMemo(() => {
    const raw = router.query?.[INSTANCE_QUERY_PARAM];
    return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
  }, [router.query]);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessDeniedState, setAccessDeniedState] = useState<boolean>(Boolean(accessDenied));
  const [attachments, setAttachments] = useState<
    Array<{ FileName: string; ServerRelativeUrl: string }>
  >([]);
  const [leadImageBroken, setLeadImageBroken] = useState(false);
  const [memberImageErrors, setMemberImageErrors] = useState<Record<number, boolean>>({});

  const buildAttachmentDownloadUrl = (projectId: string, fileName: string) => {
    const base = `/api/attachments/${encodeURIComponent(projectId)}/download?name=${encodeURIComponent(
      fileName
    )}`;
    const q = router.query?.[INSTANCE_QUERY_PARAM];
    if (typeof q === 'string' && q) {
      return `${base}&${INSTANCE_QUERY_PARAM}=${encodeURIComponent(q)}`;
    }
    return base;
  };

  useEffect(() => {
    setAccessDeniedState(Boolean(accessDenied));
  }, [accessDenied]);

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;
      if (accessDeniedState) return;
      try {
        setLoading(true);

        const projectUrl = instanceSlug
          ? `/api/projects/${encodeURIComponent(String(id))}?${INSTANCE_QUERY_PARAM}=${encodeURIComponent(instanceSlug)}`
          : `/api/projects/${encodeURIComponent(String(id))}`;

        const projectResp = await fetch(projectUrl, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });

        if (projectResp.status === 401) {
          const returnUrl = typeof router.asPath === 'string' ? router.asPath : '/roadmap';
          void router.push(`/admin/login?returnUrl=${encodeURIComponent(returnUrl)}`);
          return;
        }

        if (projectResp.status === 403) {
          setAccessDeniedState(true);
          setProject(null);
          setAttachments([]);
          return;
        }

        if (!projectResp.ok) {
          if (projectResp.status === 404) {
            setProject(null);
            setAttachments([]);
            return;
          }
          const payload = await projectResp.json().catch(() => null);
          throw new Error(payload?.error || `Failed to fetch project (${projectResp.status})`);
        }

        const data = await projectResp.json();
        setAccessDeniedState(false);
        setProject(data);

        const attachmentsUrl = instanceSlug
          ? `/api/attachments/${encodeURIComponent(String(id))}?${INSTANCE_QUERY_PARAM}=${encodeURIComponent(instanceSlug)}`
          : `/api/attachments/${encodeURIComponent(String(id))}`;

        try {
          const attResp = await fetch(attachmentsUrl, {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
          });

          if (attResp.status === 401) {
            setAttachments([]);
          } else if (attResp.status === 403) {
            setAttachments([]);
          } else if (!attResp.ok) {
            setAttachments([]);
          } else {
            const files = await attResp.json();
            setAttachments(Array.isArray(files) ? files : []);
          }
        } catch {
          setAttachments([]);
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        setProject(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, accessDeniedState, instanceSlug, router]);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const allowed = await hasAdminAccess();
        setIsAdmin(Boolean(allowed));
      } catch {
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, []);

  if (accessDeniedState) {
    return (
      <PageShell>
        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <div className="max-w-lg rounded-3xl border border-amber-500/30 bg-amber-500/10 p-10 text-center shadow-xl shadow-slate-950/40">
            <FiInfo className="mx-auto h-10 w-10 text-amber-200" aria-hidden="true" />
            <h1 className="mt-4 text-xl font-semibold text-white">Kein Zugriff</h1>
            <p className="mt-3 text-sm text-slate-200">
              Du hast keinen Zugriff auf diese Roadmap-Instanz. Bitte lasse dir eine Gruppe im
              Format <span className="font-mono">admin-&lt;instanz&gt;</span> zuweisen oder verwende{' '}
              <span className="font-mono">superadmin</span> für Vollzugriff.
            </p>
            <div className="mt-6">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                Zum Adminbereich
              </Link>
            </div>
          </div>
        </main>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell>
        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <JSDoITLoader message="Projektinformationen werden geladen …" />
        </main>
      </PageShell>
    );
  }

  if (!project) {
    return (
      <PageShell>
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
          <div className="max-w-md space-y-6 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-10 shadow-xl shadow-slate-950/40">
            <FiInfo className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-white">Projekt nicht gefunden</h1>
            <p className="text-sm text-slate-300">
              Das angefragte Projekt existiert nicht oder Sie haben keine Berechtigung. Bitte kehren
              Sie zur Roadmap zurück und wählen Sie ein anderes Projekt.
            </p>
            <Link
              href="/roadmap"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              Zur Roadmap
            </Link>
          </div>
        </main>
      </PageShell>
    );
  }

  const projectFields = sanitizeProjectFields(project.ProjectFields);
  const hasLeadImage = Boolean(project.projektleitungImageUrl) && !leadImageBroken;

  const timeline = renderPhaseTimeline(project.projektphase);

  return (
    <PageShell>
      <main className="relative flex-1">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[8%] top-[-10%] h-64 w-64 rounded-full bg-sky-500/25 blur-3xl" />
          <div className="absolute right-[12%] top-1/3 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-6 py-12 sm:px-8 lg:py-16 space-y-10">
          <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 px-6 py-8 shadow-xl shadow-slate-950/40 sm:px-9">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-5">
                <Link
                  href="/roadmap"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/70">
                    <FiArrowLeft className="h-4 w-4" />
                  </span>
                  Zur Roadmap
                </Link>

                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
                    {project.title || 'Unbenanntes Projekt'}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                    <span
                      className={`inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                        statusStyles[project.status] || statusStyles.planned
                      }`}
                    >
                      {statusLabels[project.status] || 'Unbekannt'}
                    </span>
                    <span className="rounded-full border border-slate-700/80 px-4 py-1 text-xs uppercase tracking-[0.25em] text-slate-400">
                      Zeitraum: {formatDate(project.startDate)} – {formatDate(project.endDate)}
                    </span>
                    {project.projektphase && (
                      <span className="rounded-full border border-slate-700/80 px-4 py-1 text-xs uppercase tracking-[0.25em] text-slate-400">
                        Phase: {project.projektphase}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 text-sm">
                {isAdmin && (
                  <Link
                    href={`/admin/projects/edit/${project.id}`}
                    className="rounded-full border border-sky-500/60 px-4 py-2 text-center font-semibold text-sky-200 transition hover:border-sky-400 hover:text-white"
                  >
                    Projekt bearbeiten
                  </Link>
                )}
                <a
                  href="#anhange"
                  className="rounded-full border border-slate-700 px-4 py-2 text-center font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
                >
                  Anhänge ansehen
                </a>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6">
              <InfoCard title="Beschreibung">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {project.description || 'Keine Beschreibung hinterlegt.'}
                </p>
              </InfoCard>

              <InfoCard title="Bisher erreicht">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {project.bisher || 'Keine Informationen hinterlegt.'}
                </p>
              </InfoCard>

              <InfoCard title="Nächste Schritte">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {project.zukunft || 'Keine Informationen hinterlegt.'}
                </p>
              </InfoCard>

              {project.links && project.links.length > 0 && (
                <InfoCard title="Referenzen & Links">
                  <ul className="space-y-3">
                    {project.links.map((link) => (
                      <li
                        key={link.id}
                        className="rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 text-sm"
                      >
                        <div className="font-semibold text-white">{link.title || link.url}</div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-sky-300 transition hover:text-sky-200"
                        >
                          Öffnen
                          <FiExternalLink className="h-4 w-4" aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </InfoCard>
              )}
            </div>

            <div className="space-y-6">
              <InfoCard title="Projektfelder">
                {projectFields.length > 0 ? (
                  <ul className="space-y-2 text-sm text-slate-300">
                    {projectFields.map((field, index) => (
                      <li
                        key={`${field}-${index}`}
                        className="rounded-full border border-slate-800/70 bg-slate-900/70 px-4 py-2"
                      >
                        {field}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">Keine Felder hinterlegt.</p>
                )}
              </InfoCard>

              <InfoCard title="Team">
                <div className="space-y-4">
                  {project.projektleitung && (
                    <TeamCard
                      name={project.projektleitung}
                      role="Projektleitung"
                      imageUrl={hasLeadImage ? (project.projektleitungImageUrl ?? '') : undefined}
                      fallbackInitial={project.projektleitung[0]}
                      onImageError={() => setLeadImageBroken(true)}
                    />
                  )}

                  {project.teamMembers && project.teamMembers.length > 0 ? (
                    project.teamMembers.map((member: TeamMember, index: number) => (
                      <TeamCard
                        key={`${member.id || member.name}-${index}`}
                        name={member.name || 'Teammitglied'}
                        role={member.role || 'Team'}
                        imageUrl={
                          member.imageUrl && !memberImageErrors[index] ? member.imageUrl : undefined
                        }
                        fallbackInitial={member.name ? member.name.charAt(0) : 'T'}
                        onImageError={() =>
                          setMemberImageErrors((prev) => ({ ...prev, [index]: true }))
                        }
                      />
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">
                      Keine weiteren Teammitglieder eingetragen.
                    </p>
                  )}
                </div>
              </InfoCard>
            </div>

            <div className="space-y-6">
              <InfoCard title="Geplante Umsetzung">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {project.geplante_umsetzung || 'Keine Angaben zur Umsetzung vorhanden.'}
                </p>
              </InfoCard>

              {project.naechster_meilenstein && (
                <InfoCard title="Nächster Meilenstein">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {project.naechster_meilenstein}
                  </p>
                </InfoCard>
              )}

              <InfoCard title="Budget">
                <p className="text-2xl font-semibold text-white">
                  {project.budget ? `${project.budget} CHF` : 'Keine Budgetangabe'}
                </p>
              </InfoCard>

              <InfoCard title="Anhänge" id="anhange">
                <ul className="space-y-2 text-sm text-slate-300">
                  {attachments.length === 0 && (
                    <li className="rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 text-slate-400">
                      Keine Anhänge vorhanden.
                    </li>
                  )}
                  {attachments.map((attachment) => (
                    <li
                      key={attachment.ServerRelativeUrl}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <FiExternalLink className="h-4 w-4 text-sky-300" aria-hidden="true" />
                        <span className="truncate">{attachment.FileName}</span>
                      </div>
                      <a
                        href={buildAttachmentDownloadUrl(String(id), attachment.FileName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300 transition hover:text-sky-200"
                      >
                        Öffnen
                      </a>
                    </li>
                  ))}
                </ul>
              </InfoCard>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 px-6 py-8 shadow-xl shadow-slate-950/40 sm:px-9">
            <h2 className="text-lg font-semibold text-white sm:text-xl">Projektphase</h2>
            <div className="mt-5">{timeline}</div>
          </section>
        </div>
      </main>
    </PageShell>
  );
};

export default ProjectDetailPage;

export const getServerSideProps: GetServerSideProps<{ accessDenied?: boolean }> = async (ctx) => {
  const session = extractAdminSessionFromHeaders({
    authorization: ctx.req.headers.authorization,
    cookie: ctx.req.headers.cookie,
  });

  if (!session?.isAdmin) {
    const returnUrl = typeof ctx.resolvedUrl === 'string' ? ctx.resolvedUrl : '/project';
    return {
      redirect: {
        destination: `/admin/login?returnUrl=${encodeURIComponent(returnUrl)}`,
        permanent: false,
      },
    };
  }

  const instance = await resolveInstanceForAdminSession(ctx.req, session);
  if (!instance) {
    return { props: {} };
  }

  if (ctx.res) {
    ctx.res.setHeader('Set-Cookie', setInstanceCookieHeader(instance.slug));
  }

  if (!(await isAdminSessionAllowedForInstance({ session, instance }))) {
    const fallback = await resolveFirstAllowedInstanceForAdminSession(session);
    if (fallback && fallback.slug && fallback.slug !== instance.slug) {
      if (ctx.res) {
        ctx.res.setHeader('Set-Cookie', setInstanceCookieHeader(fallback.slug));
      }
      return {
        redirect: {
          destination: `/roadmap?${INSTANCE_QUERY_PARAM}=${encodeURIComponent(fallback.slug)}`,
          permanent: false,
        },
      };
    }
    return { props: { accessDenied: true } };
  }

  return { props: {} };
};

type InfoCardProps = {
  title: string;
  children: ReactNode;
  id?: string;
};

const InfoCard: FC<InfoCardProps> = ({ title, children, id }) => (
  <section
    id={id}
    className="rounded-3xl border border-slate-800/70 bg-slate-950/70 px-5 py-6 shadow-lg shadow-slate-950/40 sm:px-6"
  >
    <header className="border-b border-slate-800/60 pb-4">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
    </header>
    <div className="pt-4">{children}</div>
  </section>
);

type TeamCardProps = {
  name: string;
  role: string;
  imageUrl?: string;
  fallbackInitial?: string;
  onImageError?: () => void;
};

const TeamCard: FC<TeamCardProps> = ({ name, role, imageUrl, fallbackInitial, onImageError }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3">
    {imageUrl ? (
      <Image
        src={imageUrl}
        alt={name}
        width={48}
        height={48}
        className="h-12 w-12 flex-shrink-0 rounded-full border border-slate-700 object-cover"
        onError={onImageError}
        unoptimized
      />
    ) : (
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-base font-semibold text-slate-100">
        {fallbackInitial || name.charAt(0)}
      </div>
    )}
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-white">{name}</p>
      <p className="truncate text-xs text-slate-400">{role}</p>
    </div>
  </div>
);

const renderPhaseTimeline = (phase?: string | null) => {
  const normalized = (phase || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

  const steps: Array<{ key: string; label: string; desc: string }> = [
    {
      key: 'initialisierung',
      label: 'Initialisierung',
      desc: 'Ziele, Scope und Machbarkeit klären.',
    },
    {
      key: 'konzept',
      label: 'Konzept',
      desc: 'Lösungsskizze, Architektur, Planung.',
    },
    {
      key: 'realisierung',
      label: 'Realisierung',
      desc: 'Umsetzung, Tests und Integration.',
    },
    {
      key: 'einfuehrung',
      label: 'Einführung',
      desc: 'Rollout, Schulung, Change Management.',
    },
    {
      key: 'abschluss',
      label: 'Abschluss',
      desc: 'Review, Dokumentation, Übergabe.',
    },
  ];

  const activeKey = normalized.replace('ue', 'u').replace('oe', 'o').replace('ae', 'a');

  return (
    <div className="grid gap-3 md:grid-cols-5">
      {steps.map((step, index) => {
        const matchKey = step.key.replace('ue', 'u').replace('oe', 'o').replace('ae', 'a');
        const isActive = activeKey === matchKey;

        return (
          <div
            key={step.key}
            className={`relative overflow-hidden rounded-2xl border px-4 py-5 text-sm transition ${
              isActive
                ? 'border-sky-500/60 bg-sky-500/15 text-sky-100 shadow-lg shadow-sky-900/40'
                : 'border-slate-800/70 bg-slate-900/70 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                {index + 1}
              </span>
              {isActive && (
                <span className="rounded-full border border-sky-400/60 bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.35em] text-sky-100">
                  Aktiv
                </span>
              )}
            </div>
            <h3 className="mt-3 text-base font-semibold">{step.label}</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">{step.desc}</p>
          </div>
        );
      })}
    </div>
  );
};
