import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState, type FC, type ReactNode } from 'react';
import type { GetServerSideProps } from 'next';
import { FiArrowLeft, FiExternalLink, FiInfo } from 'react-icons/fi';
import JSDoITLoader from '@/components/JSDoITLoader';
import RichTextContent from '@/components/RichTextContent';
import SiteHeader from '@/components/SiteHeader';
import { Project, TeamMember } from '@/types';
import { hasAdminAccessToCurrentInstance, hasValidAdminSession } from '@/utils/auth';
import { INSTANCE_QUERY_PARAM } from '@/utils/instanceConfig';
import { extractAdminSessionFromHeaders } from '@/utils/apiAuth';
import { setInstanceCookieHeader } from '@/utils/instanceConfig';
import { isReadSessionAllowedForInstance } from '@/utils/instanceAccessServer';
import {
  resolveFirstAllowedInstanceForAdminSession,
  resolveInstanceForAdminSession,
} from '@/utils/instanceSelection';

const statusStyles: Record<string, string> = {
  completed: 'ds-project-status is-completed',
  'in-progress': 'ds-project-status is-active',
  planned: 'ds-project-status is-planned',
  paused: 'ds-project-status is-paused',
  cancelled: 'ds-project-status is-cancelled',
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
  <div className="ds-page-shell">
    <SiteHeader activeRoute="roadmap" />
    {children}
    <footer className="ds-footer">
      <div className="ds-container ds-footer-inner">
        <span>JSDoIT Roadmap Center</span>
        <div className="ds-footer-links">
          <Link className="ds-footer-link" href="/instances">
            Instanzen
          </Link>
          <Link className="ds-footer-link" href="/help">
            Hilfe
          </Link>
          <Link className="ds-footer-link" href="/roadmap">
            Roadmap
          </Link>
        </div>
      </div>
    </footer>
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
  const fetchRequestIdRef = useRef(0);

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
    const requestId = ++fetchRequestIdRef.current;
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
          if (requestId !== fetchRequestIdRef.current) return;
          const returnUrl = typeof router.asPath === 'string' ? router.asPath : '/roadmap';
          void router.push(`/admin/login?returnUrl=${encodeURIComponent(returnUrl)}`);
          return;
        }

        if (projectResp.status === 403) {
          if (requestId !== fetchRequestIdRef.current) return;
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
        if (requestId !== fetchRequestIdRef.current) return;
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
            if (requestId !== fetchRequestIdRef.current) return;
            setAttachments(Array.isArray(files) ? files : []);
          }
        } catch {
          if (requestId !== fetchRequestIdRef.current) return;
          setAttachments([]);
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        if (requestId !== fetchRequestIdRef.current) return;
        setProject(null);
      } finally {
        if (requestId !== fetchRequestIdRef.current) return;
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, accessDeniedState, instanceSlug, router]);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const [hasSession, hasInstanceAdminAccess] = await Promise.all([
          hasValidAdminSession(),
          hasAdminAccessToCurrentInstance(),
        ]);
        setIsAdmin(Boolean(hasSession && hasInstanceAdminAccess));
      } catch {
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, []);

  if (accessDeniedState) {
    return (
      <PageShell>
        <main className="ds-page-main ds-project-page-main">
          <div className="ds-container ds-centered-state">
            <div className="ds-card ds-project-state-card is-warning">
              <FiInfo className="ds-project-state-icon" aria-hidden="true" />
              <h1>Kein Zugriff</h1>
              <p>
                Du hast keinen Zugriff auf diese Roadmap-Instanz. Sichtbarkeit wird pro Instanz
                anhand deiner Abteilung oder expliziter Admin-Berechtigungen gesteuert.
              </p>
              <Link href="/roadmap" className="ds-button ds-button-primary ds-project-state-action">
                Zur Roadmap
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
        <main className="ds-page-main ds-project-page-main">
          <div className="ds-container ds-centered-state">
            <JSDoITLoader message="Projektinformationen werden geladen …" />
          </div>
        </main>
      </PageShell>
    );
  }

  if (!project) {
    return (
      <PageShell>
        <main className="ds-page-main ds-project-page-main">
          <div className="ds-container ds-centered-state">
            <div className="ds-card ds-project-state-card">
              <FiInfo className="ds-project-state-icon" aria-hidden="true" />
              <h1>Projekt nicht gefunden</h1>
              <p>
                Das angefragte Projekt existiert nicht oder Sie haben keine Berechtigung. Bitte
                kehren Sie zur Roadmap zurück und wählen Sie ein anderes Projekt.
              </p>
              <Link href="/roadmap" className="ds-button ds-button-primary ds-project-state-action">
                Zur Roadmap
              </Link>
            </div>
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
      <main className="ds-page-main ds-project-page-main">
        <div className="ds-container ds-project-detail-shell">
          <section className="ds-card ds-project-hero-card">
            <div className="ds-project-hero-layout">
              <div className="ds-project-hero-content">
                <Link href="/roadmap" className="ds-project-back-link">
                  <span className="ds-project-back-icon">
                    <FiArrowLeft className="ds-icon-sm" />
                  </span>
                  Zur Roadmap
                </Link>

                <div>
                  <p className="ds-panel-label">Projektübersicht</p>
                  <h1 className="ds-project-title">{project.title || 'Unbenanntes Projekt'}</h1>
                  <div className="ds-project-meta-row">
                    <span className={statusStyles[project.status] || statusStyles.planned}>
                      {statusLabels[project.status] || 'Unbekannt'}
                    </span>
                    <span className="ds-project-pill">
                      Zeitraum: {formatDate(project.startDate)} – {formatDate(project.endDate)}
                    </span>
                    {project.projektphase && (
                      <span className="ds-project-pill">Phase: {project.projektphase}</span>
                    )}
                    {project.isReadOnlyMirror && (
                      <span className="ds-project-pill is-warning">
                        Gespiegelt aus{' '}
                        {project.mirrorSourceInstanceName || project.mirrorSourceInstanceSlug}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="ds-project-actions">
                {isAdmin && (
                  <Link
                    href={`/admin/projects/edit/${project.id}`}
                    className="ds-button ds-button-secondary"
                  >
                    Projekt bearbeiten
                  </Link>
                )}
                <a href="#anhange" className="ds-button ds-button-secondary">
                  Anhänge ansehen
                </a>
              </div>
            </div>
          </section>

          <section className="ds-project-content-grid">
            <div className="ds-project-column">
              <InfoCard title="Beschreibung">
                <RichTextContent
                  value={project.description}
                  emptyText="Keine Beschreibung hinterlegt."
                  className="ds-project-rich-text"
                />
              </InfoCard>

              <InfoCard title="Bisher erreicht">
                <RichTextContent
                  value={project.bisher}
                  emptyText="Keine Informationen hinterlegt."
                  className="ds-project-rich-text"
                />
              </InfoCard>

              <InfoCard title="Nächste Schritte">
                <RichTextContent
                  value={project.zukunft}
                  emptyText="Keine Informationen hinterlegt."
                  className="ds-project-rich-text"
                />
              </InfoCard>

              {project.links && project.links.length > 0 && (
                <InfoCard title="Referenzen & Links">
                  <ul className="ds-project-list">
                    {project.links.map((link) => (
                      <li key={link.id} className="ds-project-list-item">
                        <div className="ds-project-list-title">{link.title || link.url}</div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ds-project-inline-link"
                        >
                          Öffnen
                          <FiExternalLink className="ds-icon-sm" aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </InfoCard>
              )}
            </div>

            <div className="ds-project-column">
              <InfoCard title="Projektfelder">
                {projectFields.length > 0 ? (
                  <ul className="ds-project-chip-list">
                    {projectFields.map((field, index) => (
                      <li key={`${field}-${index}`} className="ds-project-chip">
                        {field}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="ds-project-empty">Keine Felder hinterlegt.</p>
                )}
              </InfoCard>

              <InfoCard title="Team">
                <div className="ds-project-list">
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
                    <p className="ds-project-empty">Keine weiteren Teammitglieder eingetragen.</p>
                  )}
                </div>
              </InfoCard>
            </div>

            <div className="ds-project-column">
              <InfoCard title="Geplante Umsetzung">
                <p className="ds-project-copy">
                  {project.geplante_umsetzung || 'Keine Angaben zur Umsetzung vorhanden.'}
                </p>
              </InfoCard>

              {project.naechster_meilenstein && (
                <InfoCard title="Nächster Meilenstein">
                  <p className="ds-project-copy">{project.naechster_meilenstein}</p>
                </InfoCard>
              )}

              <InfoCard title="Budget">
                <p className="ds-project-budget">
                  {project.budget ? `${project.budget} CHF` : 'Keine Budgetangabe'}
                </p>
              </InfoCard>

              <InfoCard title="Anhänge" id="anhange">
                <ul className="ds-project-list">
                  {attachments.length === 0 && (
                    <li className="ds-project-list-item is-empty">Keine Anhänge vorhanden.</li>
                  )}
                  {attachments.map((attachment) => (
                    <li key={attachment.ServerRelativeUrl} className="ds-project-attachment-item">
                      <div className="ds-project-attachment-label">
                        <FiExternalLink className="ds-icon-sm" aria-hidden="true" />
                        <span className="truncate">{attachment.FileName}</span>
                      </div>
                      <a
                        href={buildAttachmentDownloadUrl(String(id), attachment.FileName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ds-project-inline-link"
                      >
                        Öffnen
                      </a>
                    </li>
                  ))}
                </ul>
              </InfoCard>
            </div>
          </section>

          <section className="ds-card ds-project-phase-card">
            <h2>Projektphase</h2>
            <div>{timeline}</div>
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
  const forwardedHeaders = {
    authorization:
      typeof ctx.req.headers.authorization === 'string' ? ctx.req.headers.authorization : undefined,
    cookie: typeof ctx.req.headers.cookie === 'string' ? ctx.req.headers.cookie : undefined,
  };

  if (!session) {
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

  if (
    !(await isReadSessionAllowedForInstance({
      session,
      instance,
      requestHeaders: forwardedHeaders,
    }))
  ) {
    const fallback = await resolveFirstAllowedInstanceForAdminSession(session, ctx.req);
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
  <section id={id} className="ds-card ds-project-info-card">
    <header className="ds-project-info-card-header">
      <h3>{title}</h3>
    </header>
    <div className="ds-project-info-card-body">{children}</div>
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
  <div className="ds-project-team-card">
    {imageUrl ? (
      <Image
        src={imageUrl}
        alt={name}
        width={48}
        height={48}
        loading="eager"
        className="ds-project-avatar"
        onError={onImageError}
        unoptimized
      />
    ) : (
      <div className="ds-project-avatar is-fallback">{fallbackInitial || name.charAt(0)}</div>
    )}
    <div className="ds-project-team-text">
      <p>{name}</p>
      <span>{role}</span>
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
    <div className="ds-project-phase-grid">
      {steps.map((step, index) => {
        const matchKey = step.key.replace('ue', 'u').replace('oe', 'o').replace('ae', 'a');
        const isActive = activeKey === matchKey;

        return (
          <div key={step.key} className={`ds-project-phase-step ${isActive ? 'is-active' : ''}`}>
            <div className="ds-project-phase-step-topline">
              <span>{index + 1}</span>
              {isActive && <span className="ds-project-phase-active-badge">Aktiv</span>}
            </div>
            <h3>{step.label}</h3>
            <p>{step.desc}</p>
          </div>
        );
      })}
    </div>
  );
};
