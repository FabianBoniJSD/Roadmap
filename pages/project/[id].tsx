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
  completed:
    'ds-project-status [display:inline-flex] [align-items:center] [width:fit-content] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-default)] [font-size:0.6875rem] [font-weight:850] [letter-spacing:0.2em] [text-transform:uppercase] [min-height:32px] [padding-inline:14px] [&.is-active]:[border-color:color-mix(in_srgb,_var(--ds-accent)_48%,_var(--ds-border-default))] [&.is-active]:[background:var(--ds-accent-soft)] [&.is-active]:[color:var(--ds-accent-strong)] [&.is-completed]:[border-color:color-mix(in_srgb,_var(--ds-success)_52%,_var(--ds-border-default))] [&.is-completed]:[background:color-mix(in_srgb,_var(--ds-success)_14%,_transparent)] [&.is-completed]:[color:var(--ds-success)] [&.is-planned]:[color:var(--ds-text-strong)] [&.is-paused]:[border-color:color-mix(in_srgb,_var(--ds-warning)_52%,_var(--ds-border-default))] [&.is-paused]:[background:color-mix(in_srgb,_var(--ds-warning)_12%,_transparent)] [&.is-paused]:[color:var(--ds-warning)] [&.is-cancelled]:[border-color:color-mix(in_srgb,_var(--ds-danger)_52%,_var(--ds-border-default))] [&.is-cancelled]:[background:color-mix(in_srgb,_var(--ds-danger)_12%,_transparent)] [&.is-cancelled]:[color:var(--ds-danger)] is-completed',
  'in-progress':
    'ds-project-status [display:inline-flex] [align-items:center] [width:fit-content] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-default)] [font-size:0.6875rem] [font-weight:850] [letter-spacing:0.2em] [text-transform:uppercase] [min-height:32px] [padding-inline:14px] [&.is-active]:[border-color:color-mix(in_srgb,_var(--ds-accent)_48%,_var(--ds-border-default))] [&.is-active]:[background:var(--ds-accent-soft)] [&.is-active]:[color:var(--ds-accent-strong)] [&.is-completed]:[border-color:color-mix(in_srgb,_var(--ds-success)_52%,_var(--ds-border-default))] [&.is-completed]:[background:color-mix(in_srgb,_var(--ds-success)_14%,_transparent)] [&.is-completed]:[color:var(--ds-success)] [&.is-planned]:[color:var(--ds-text-strong)] [&.is-paused]:[border-color:color-mix(in_srgb,_var(--ds-warning)_52%,_var(--ds-border-default))] [&.is-paused]:[background:color-mix(in_srgb,_var(--ds-warning)_12%,_transparent)] [&.is-paused]:[color:var(--ds-warning)] [&.is-cancelled]:[border-color:color-mix(in_srgb,_var(--ds-danger)_52%,_var(--ds-border-default))] [&.is-cancelled]:[background:color-mix(in_srgb,_var(--ds-danger)_12%,_transparent)] [&.is-cancelled]:[color:var(--ds-danger)] is-active',
  planned:
    'ds-project-status [display:inline-flex] [align-items:center] [width:fit-content] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-default)] [font-size:0.6875rem] [font-weight:850] [letter-spacing:0.2em] [text-transform:uppercase] [min-height:32px] [padding-inline:14px] [&.is-active]:[border-color:color-mix(in_srgb,_var(--ds-accent)_48%,_var(--ds-border-default))] [&.is-active]:[background:var(--ds-accent-soft)] [&.is-active]:[color:var(--ds-accent-strong)] [&.is-completed]:[border-color:color-mix(in_srgb,_var(--ds-success)_52%,_var(--ds-border-default))] [&.is-completed]:[background:color-mix(in_srgb,_var(--ds-success)_14%,_transparent)] [&.is-completed]:[color:var(--ds-success)] [&.is-planned]:[color:var(--ds-text-strong)] [&.is-paused]:[border-color:color-mix(in_srgb,_var(--ds-warning)_52%,_var(--ds-border-default))] [&.is-paused]:[background:color-mix(in_srgb,_var(--ds-warning)_12%,_transparent)] [&.is-paused]:[color:var(--ds-warning)] [&.is-cancelled]:[border-color:color-mix(in_srgb,_var(--ds-danger)_52%,_var(--ds-border-default))] [&.is-cancelled]:[background:color-mix(in_srgb,_var(--ds-danger)_12%,_transparent)] [&.is-cancelled]:[color:var(--ds-danger)] is-planned',
  paused:
    'ds-project-status [display:inline-flex] [align-items:center] [width:fit-content] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-default)] [font-size:0.6875rem] [font-weight:850] [letter-spacing:0.2em] [text-transform:uppercase] [min-height:32px] [padding-inline:14px] [&.is-active]:[border-color:color-mix(in_srgb,_var(--ds-accent)_48%,_var(--ds-border-default))] [&.is-active]:[background:var(--ds-accent-soft)] [&.is-active]:[color:var(--ds-accent-strong)] [&.is-completed]:[border-color:color-mix(in_srgb,_var(--ds-success)_52%,_var(--ds-border-default))] [&.is-completed]:[background:color-mix(in_srgb,_var(--ds-success)_14%,_transparent)] [&.is-completed]:[color:var(--ds-success)] [&.is-planned]:[color:var(--ds-text-strong)] [&.is-paused]:[border-color:color-mix(in_srgb,_var(--ds-warning)_52%,_var(--ds-border-default))] [&.is-paused]:[background:color-mix(in_srgb,_var(--ds-warning)_12%,_transparent)] [&.is-paused]:[color:var(--ds-warning)] [&.is-cancelled]:[border-color:color-mix(in_srgb,_var(--ds-danger)_52%,_var(--ds-border-default))] [&.is-cancelled]:[background:color-mix(in_srgb,_var(--ds-danger)_12%,_transparent)] [&.is-cancelled]:[color:var(--ds-danger)] is-paused',
  cancelled:
    'ds-project-status [display:inline-flex] [align-items:center] [width:fit-content] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-default)] [font-size:0.6875rem] [font-weight:850] [letter-spacing:0.2em] [text-transform:uppercase] [min-height:32px] [padding-inline:14px] [&.is-active]:[border-color:color-mix(in_srgb,_var(--ds-accent)_48%,_var(--ds-border-default))] [&.is-active]:[background:var(--ds-accent-soft)] [&.is-active]:[color:var(--ds-accent-strong)] [&.is-completed]:[border-color:color-mix(in_srgb,_var(--ds-success)_52%,_var(--ds-border-default))] [&.is-completed]:[background:color-mix(in_srgb,_var(--ds-success)_14%,_transparent)] [&.is-completed]:[color:var(--ds-success)] [&.is-planned]:[color:var(--ds-text-strong)] [&.is-paused]:[border-color:color-mix(in_srgb,_var(--ds-warning)_52%,_var(--ds-border-default))] [&.is-paused]:[background:color-mix(in_srgb,_var(--ds-warning)_12%,_transparent)] [&.is-paused]:[color:var(--ds-warning)] [&.is-cancelled]:[border-color:color-mix(in_srgb,_var(--ds-danger)_52%,_var(--ds-border-default))] [&.is-cancelled]:[background:color-mix(in_srgb,_var(--ds-danger)_12%,_transparent)] [&.is-cancelled]:[color:var(--ds-danger)] is-cancelled',
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
  <div className="ds-page-shell before:[position:absolute] before:[inset:0] before:[z-index:0] before:[pointer-events:none] before:[background-size:56px_56px] after:[position:absolute] after:[right:-10%] after:[bottom:-25%] after:[left:-10%] after:[z-index:0] after:[height:38vh] after:[pointer-events:none] [position:relative] [isolation:isolate] [display:flex] [min-height:100vh] [flex-direction:column] [overflow:hidden] [background:var(--ds-bg-page)] [color:var(--ds-text-default)] [font-family:var(--ds-font-sans)] [&>*]:[position:relative] [&>*]:[z-index:1]">
    <SiteHeader activeRoute="roadmap" />
    {children}
    <footer className="ds-footer [border-top:1px_solid_var(--ds-border-subtle)] [background:color-mix(in_srgb,_var(--ds-bg-page)_82%,_transparent)] ">
      <div className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-footer-inner [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-4)] [padding-block:24px] [color:var(--ds-text-muted)] [font-size:0.875rem] max-[760px]:[align-items:flex-start] max-[760px]:[flex-direction:column]">
        <span>JSDoIT Roadmap Center</span>
        <div className="ds-footer-links [display:flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-4)]">
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
          <Link
            className="ds-footer-link [color:var(--ds-text-muted)] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
            href="/roadmap"
          >
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
    Array<{ DocumentId: string; FileName: string; ServerRelativeUrl: string }>
  >([]);
  const [leadImageBroken, setLeadImageBroken] = useState(false);
  const [memberImageErrors, setMemberImageErrors] = useState<Record<number, boolean>>({});
  const fetchRequestIdRef = useRef(0);

  const buildAttachmentDownloadUrl = (projectId: string, documentId: string) => {
    const base = `/api/attachments/${encodeURIComponent(projectId)}/download?documentId=${encodeURIComponent(
      documentId
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

        if (data?.isReadOnlyMirror) {
          setAttachments([]);
          return;
        }

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
        <main className="ds-page-main [flex:1] ds-project-page-main [padding-block:clamp(26px,_4vw,_54px)_88px]">
          <div className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-centered-state [display:flex] [justify-content:center] [padding-block:var(--ds-space-8)]">
            <div className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-project-state-card [display:grid] [max-width:680px] [justify-items:center] [padding:clamp(26px,_4vw,_40px)] [text-align:center] [&.is-warning]:[border-color:color-mix(in_srgb,_var(--ds-warning)_46%,_var(--ds-border-default))] [&.is-warning]:[background:var(--ds-bg-elevated-strong)] [&_h1]:[margin:0] [&_h1]:[color:var(--ds-text-strong)] [&_h1]:[font-weight:600] [&_h1]:[letter-spacing:-0.02em] [&_h1]:[margin-top:var(--ds-space-4)] [&_h1]:[font-size:clamp(1.25rem,_3vw,_1.75rem)] [&_p]:[margin:12px_0_0] [&_p]:[color:var(--ds-text-default)] [&_p]:[line-height:1.65] is-warning">
              <FiInfo
                className="ds-project-state-icon [width:42px] [height:42px] [color:var(--ds-accent-strong)]"
                aria-hidden="true"
              />
              <h1>Kein Zugriff</h1>
              <p>
                Du hast keinen Zugriff auf diese Roadmap-Instanz. Sichtbarkeit wird pro Instanz
                anhand deiner Abteilung oder expliziter Admin-Berechtigungen gesteuert.
              </p>
              <Link
                href="/roadmap"
                className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)] ds-project-state-action [margin-top:var(--ds-space-6)]"
              >
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
        <main className="ds-page-main [flex:1] ds-project-page-main [padding-block:clamp(26px,_4vw,_54px)_88px]">
          <div className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-centered-state [display:flex] [justify-content:center] [padding-block:var(--ds-space-8)]">
            <JSDoITLoader message="Projektinformationen werden geladen …" />
          </div>
        </main>
      </PageShell>
    );
  }

  if (!project) {
    return (
      <PageShell>
        <main className="ds-page-main [flex:1] ds-project-page-main [padding-block:clamp(26px,_4vw,_54px)_88px]">
          <div className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-centered-state [display:flex] [justify-content:center] [padding-block:var(--ds-space-8)]">
            <div className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-project-state-card [display:grid] [max-width:680px] [justify-items:center] [padding:clamp(26px,_4vw,_40px)] [text-align:center] [&.is-warning]:[border-color:color-mix(in_srgb,_var(--ds-warning)_46%,_var(--ds-border-default))] [&.is-warning]:[background:var(--ds-bg-elevated-strong)] [&_h1]:[margin:0] [&_h1]:[color:var(--ds-text-strong)] [&_h1]:[font-weight:600] [&_h1]:[letter-spacing:-0.02em] [&_h1]:[margin-top:var(--ds-space-4)] [&_h1]:[font-size:clamp(1.25rem,_3vw,_1.75rem)] [&_p]:[margin:12px_0_0] [&_p]:[color:var(--ds-text-default)] [&_p]:[line-height:1.65]">
              <FiInfo
                className="ds-project-state-icon [width:42px] [height:42px] [color:var(--ds-accent-strong)]"
                aria-hidden="true"
              />
              <h1>Projekt nicht gefunden</h1>
              <p>
                Das angefragte Projekt existiert nicht oder Sie haben keine Berechtigung. Bitte
                kehren Sie zur Roadmap zurück und wählen Sie ein anderes Projekt.
              </p>
              <Link
                href="/roadmap"
                className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)] ds-project-state-action [margin-top:var(--ds-space-6)]"
              >
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
      <main className="ds-page-main [flex:1] ds-project-page-main [padding-block:clamp(26px,_4vw,_54px)_88px]">
        <div className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-project-detail-shell [display:grid] [gap:var(--ds-space-8)]">
          <section className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-project-hero-card [border-radius:var(--ds-radius-xl)] [padding:clamp(24px,_4vw,_36px)]">
            <div className="ds-project-hero-layout [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:var(--ds-space-6)]">
              <div className="ds-project-hero-content [display:grid] [gap:var(--ds-space-4)]">
                <Link
                  href="/roadmap"
                  className="ds-project-back-link [display:inline-flex] [width:fit-content] [align-items:center] [gap:10px] [color:var(--ds-text-default)] [font-size:0.875rem] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
                >
                  <span className="ds-project-back-icon [display:grid] [width:34px] [height:34px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:50%] [background:var(--ds-bg-soft)]">
                    <FiArrowLeft className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                  </span>
                  Zur Roadmap
                </Link>

                <div>
                  <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                    Projektübersicht
                  </p>
                  <h1 className="ds-project-title [max-width:840px] [margin:10px_0_0] [color:var(--ds-text-strong)] [font-size:clamp(2rem,_5vw,_4.5rem)] [font-weight:600] [line-height:0.98] [letter-spacing:-0.04em]">
                    {project.title || 'Unbenanntes Projekt'}
                  </h1>
                  <div className="ds-project-meta-row [display:flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-3)] [margin-top:var(--ds-space-5)]">
                    <span className={statusStyles[project.status] || statusStyles.planned}>
                      {statusLabels[project.status] || 'Unbekannt'}
                    </span>
                    <span className="ds-project-pill [display:inline-flex] [align-items:center] [width:fit-content] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-default)] [font-size:0.6875rem] [font-weight:600] [letter-spacing:normal] [text-transform:none] [min-height:32px] [padding-inline:14px] [&.is-warning]:[border-color:color-mix(in_srgb,_var(--ds-warning)_52%,_var(--ds-border-default))] [&.is-warning]:[background:color-mix(in_srgb,_var(--ds-warning)_12%,_transparent)] [&.is-warning]:[color:var(--ds-warning)]">
                      Zeitraum: {formatDate(project.startDate)} – {formatDate(project.endDate)}
                    </span>
                    {project.projektphase && (
                      <span className="ds-project-pill [display:inline-flex] [align-items:center] [width:fit-content] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-default)] [font-size:0.6875rem] [font-weight:600] [letter-spacing:normal] [text-transform:none] [min-height:32px] [padding-inline:14px] [&.is-warning]:[border-color:color-mix(in_srgb,_var(--ds-warning)_52%,_var(--ds-border-default))] [&.is-warning]:[background:color-mix(in_srgb,_var(--ds-warning)_12%,_transparent)] [&.is-warning]:[color:var(--ds-warning)]">
                        Phase: {project.projektphase}
                      </span>
                    )}
                    {project.isReadOnlyMirror && (
                      <span className="ds-project-pill [display:inline-flex] [align-items:center] [width:fit-content] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-default)] [font-size:0.6875rem] [font-weight:600] [letter-spacing:normal] [text-transform:none] [min-height:32px] [padding-inline:14px] [&.is-warning]:[border-color:color-mix(in_srgb,_var(--ds-warning)_52%,_var(--ds-border-default))] [&.is-warning]:[background:color-mix(in_srgb,_var(--ds-warning)_12%,_transparent)] [&.is-warning]:[color:var(--ds-warning)] is-warning">
                        Gespiegelt aus{' '}
                        {project.mirrorSourceInstanceName || project.mirrorSourceInstanceSlug}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="ds-project-actions [display:grid] [gap:var(--ds-space-4)] [min-width:190px]">
                {isAdmin && !project.isReadOnlyMirror && (
                  <Link
                    href={`/admin/projects/edit/${project.id}`}
                    className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
                  >
                    Projekt bearbeiten
                  </Link>
                )}
                {!project.isReadOnlyMirror && (
                  <a
                    href="#anhange"
                    className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
                  >
                    Anhänge ansehen
                  </a>
                )}
              </div>
            </div>
          </section>

          <section className="ds-project-content-grid [display:grid] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [gap:var(--ds-space-6)] [align-items:start]">
            <div className="ds-project-column [display:grid] [gap:var(--ds-space-4)]">
              <InfoCard title="Beschreibung">
                <RichTextContent
                  value={project.description}
                  emptyText="Keine Beschreibung hinterlegt."
                  className="ds-project-rich-text [color:var(--ds-text-default)] [font-size:0.875rem] [line-height:1.75] [&_:is(h2,_h3,_strong)]:[color:var(--ds-text-strong)]"
                />
              </InfoCard>

              <InfoCard title="Bisher erreicht">
                <RichTextContent
                  value={project.bisher}
                  emptyText="Keine Informationen hinterlegt."
                  className="ds-project-rich-text [color:var(--ds-text-default)] [font-size:0.875rem] [line-height:1.75] [&_:is(h2,_h3,_strong)]:[color:var(--ds-text-strong)]"
                />
              </InfoCard>

              <InfoCard title="Nächste Schritte">
                <RichTextContent
                  value={project.zukunft}
                  emptyText="Keine Informationen hinterlegt."
                  className="ds-project-rich-text [color:var(--ds-text-default)] [font-size:0.875rem] [line-height:1.75] [&_:is(h2,_h3,_strong)]:[color:var(--ds-text-strong)]"
                />
              </InfoCard>

              {project.links && project.links.length > 0 && (
                <InfoCard title="Referenzen & Links">
                  <ul className="ds-project-list [display:grid] [gap:var(--ds-space-3)] [margin:0] [padding:0] [list-style:none]">
                    {project.links.map((link) => (
                      <li
                        key={link.id}
                        className="ds-project-list-item [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-soft)] [padding:14px_16px] [&.is-empty]:[color:var(--ds-text-muted)]"
                      >
                        <div className="ds-project-list-title [margin:0] [color:var(--ds-text-strong)] [font-weight:600]">
                          {link.title || link.url}
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ds-project-inline-link [display:inline-flex] [align-items:center] [gap:8px] [margin-top:8px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
                        >
                          Öffnen
                          <FiExternalLink
                            className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]"
                            aria-hidden="true"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                </InfoCard>
              )}
            </div>

            <div className="ds-project-column [display:grid] [gap:var(--ds-space-4)]">
              <InfoCard title="Projektfelder">
                {projectFields.length > 0 ? (
                  <ul className="ds-project-chip-list [display:grid] [gap:var(--ds-space-3)] [margin:0] [padding:0] [list-style:none] [gap:10px]">
                    {projectFields.map((field, index) => (
                      <li
                        key={`${field}-${index}`}
                        className="ds-project-chip [display:inline-flex] [align-items:center] [width:fit-content] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-default)] [font-size:0.6875rem] [font-weight:600] [letter-spacing:normal] [text-transform:none] [padding:9px_13px] [color:var(--ds-text-strong)] [letter-spacing:normal]"
                      >
                        {field}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="ds-project-empty [color:var(--ds-text-muted)]">
                    Keine Felder hinterlegt.
                  </p>
                )}
              </InfoCard>

              <InfoCard title="Team">
                <div className="ds-project-list [display:grid] [gap:var(--ds-space-3)] [margin:0] [padding:0] [list-style:none]">
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
                    <p className="ds-project-empty [color:var(--ds-text-muted)]">
                      Keine weiteren Teammitglieder eingetragen.
                    </p>
                  )}
                </div>
              </InfoCard>
            </div>

            <div className="ds-project-column [display:grid] [gap:var(--ds-space-4)]">
              <InfoCard title="Geplante Umsetzung">
                <p className="ds-project-copy [color:var(--ds-text-default)] [font-size:0.875rem] [line-height:1.75]">
                  {project.geplante_umsetzung || 'Keine Angaben zur Umsetzung vorhanden.'}
                </p>
              </InfoCard>

              {project.naechster_meilenstein && (
                <InfoCard title="Nächster Meilenstein">
                  <p className="ds-project-copy [color:var(--ds-text-default)] [font-size:0.875rem] [line-height:1.75]">
                    {project.naechster_meilenstein}
                  </p>
                </InfoCard>
              )}

              <InfoCard title="Budget">
                <p className="ds-project-budget [color:var(--ds-text-strong)] [margin:0] [font-size:clamp(1.35rem,_3vw,_2rem)] [font-weight:600] [letter-spacing:-0.03em]">
                  {project.budget ? `${project.budget} CHF` : 'Keine Budgetangabe'}
                </p>
              </InfoCard>

              <InfoCard title="Anhänge" id="anhange">
                <ul className="ds-project-list [display:grid] [gap:var(--ds-space-3)] [margin:0] [padding:0] [list-style:none]">
                  {project.isReadOnlyMirror ? (
                    <li className="ds-project-list-item [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-soft)] [padding:14px_16px] [&.is-empty]:[color:var(--ds-text-muted)] is-empty">
                      Anhänge werden nicht in andere Roadmaps gespiegelt. Öffnen Sie dafür das
                      Projekt in der Quell-Roadmap.
                    </li>
                  ) : attachments.length === 0 ? (
                    <li className="ds-project-list-item [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-soft)] [padding:14px_16px] [&.is-empty]:[color:var(--ds-text-muted)] is-empty">
                      Keine Anhänge vorhanden.
                    </li>
                  ) : null}
                  {!project.isReadOnlyMirror &&
                    attachments.map((attachment) => (
                      <li
                        key={attachment.DocumentId}
                        className="ds-project-attachment-item [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-soft)] [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-3)] [padding:14px_16px] [&_.ds-project-inline-link]:[flex:0_0_auto] [&_.ds-project-inline-link]:[margin-top:0] [&_.ds-project-inline-link]:[margin-left:auto]"
                      >
                        <div className="ds-project-attachment-label [display:flex] [flex:1_1_auto] [min-width:0] [align-items:center] [gap:9px] [color:var(--ds-text-default)] [&_svg]:[flex:0_0_auto] [&_svg]:[color:var(--ds-accent-strong)]">
                          <FiExternalLink
                            className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]"
                            aria-hidden="true"
                          />
                          <span className="ds-project-attachment-name [display:block] [min-width:0] [overflow:hidden] [text-overflow:ellipsis] [white-space:nowrap]">
                            {attachment.FileName}
                          </span>
                        </div>
                        <a
                          href={buildAttachmentDownloadUrl(String(id), attachment.DocumentId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ds-project-inline-link [display:inline-flex] [align-items:center] [gap:8px] [margin-top:8px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
                        >
                          Öffnen
                        </a>
                      </li>
                    ))}
                </ul>
              </InfoCard>
            </div>
          </section>

          <section className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-project-phase-card [&_h2]:[margin:0] [&_h2]:[color:var(--ds-text-strong)] [&_h2]:[font-weight:600] [&_h2]:[letter-spacing:-0.02em] [border-radius:var(--ds-radius-xl)] [padding:clamp(24px,_4vw,_36px)] [display:grid] [gap:var(--ds-space-5)] [&_h2]:[font-size:clamp(1.25rem,_3vw,_1.75rem)]">
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
  const session = await extractAdminSessionFromHeaders({
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
  <section
    id={id}
    className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-project-info-card [border-radius:var(--ds-radius-xl)] [padding:0] [overflow:hidden]"
  >
    <header className="ds-project-info-card-header [padding:20px_22px] [border-bottom:1px_solid_var(--ds-border-default)] [&_h3]:[margin:0] [&_h3]:[color:var(--ds-text-strong)] [&_h3]:[font-weight:600] [&_h3]:[font-size:1.0625rem]">
      <h3>{title}</h3>
    </header>
    <div className="ds-project-info-card-body [padding:20px_22px_22px]">{children}</div>
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
  <div className="ds-project-team-card [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-soft)] [display:flex] [align-items:center] [gap:var(--ds-space-4)] [padding:13px_14px]">
    {imageUrl ? (
      <Image
        src={imageUrl}
        alt={name}
        width={48}
        height={48}
        loading="eager"
        className="ds-project-avatar [width:48px] [height:48px] [flex:0_0_auto] [border:1px_solid_var(--ds-border-default)] [border-radius:50%] [object-fit:cover] [&.is-fallback]:[display:grid] [&.is-fallback]:[place-items:center] [&.is-fallback]:[background:var(--ds-accent)] [&.is-fallback]:[color:var(--ds-text-inverse)] [&.is-fallback]:[font-weight:600]"
        onError={onImageError}
        unoptimized
      />
    ) : (
      <div className="ds-project-avatar [width:48px] [height:48px] [flex:0_0_auto] [border:1px_solid_var(--ds-border-default)] [border-radius:50%] [object-fit:cover] [&.is-fallback]:[display:grid] [&.is-fallback]:[place-items:center] [&.is-fallback]:[background:var(--ds-accent)] [&.is-fallback]:[color:var(--ds-text-inverse)] [&.is-fallback]:[font-weight:600] is-fallback">
        {fallbackInitial || name.charAt(0)}
      </div>
    )}
    <div className="ds-project-team-text [&_p]:[margin:0] [&_p]:[color:var(--ds-text-strong)] [&_p]:[font-weight:600] [min-width:0] [&_p]:[display:block] [&_p]:[overflow:hidden] [&_p]:[text-overflow:ellipsis] [&_p]:[white-space:nowrap] [&_span]:[display:block] [&_span]:[overflow:hidden] [&_span]:[text-overflow:ellipsis] [&_span]:[white-space:nowrap] [&_span]:[margin-top:4px] [&_span]:[color:var(--ds-text-muted)] [&_span]:[font-size:0.75rem]">
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
    <div className="ds-project-phase-grid [display:grid] [grid-template-columns:repeat(5,_minmax(0,_1fr))] [gap:var(--ds-space-3)]">
      {steps.map((step, index) => {
        const matchKey = step.key.replace('ue', 'u').replace('oe', 'o').replace('ae', 'a');
        const isActive = activeKey === matchKey;

        return (
          <div
            key={step.key}
            className={`ds-project-phase-step [position:relative] [overflow:hidden] [padding:18px_16px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-soft)] [color:var(--ds-text-default)] [&.is-active]:[border-color:var(--ds-border-strong)] [&.is-active]:[background:var(--ds-accent-soft)] [&.is-active]:[color:var(--ds-text-strong)] [&_h3]:[margin:14px_0_0] [&_h3]:[color:var(--ds-text-strong)] [&_h3]:[font-size:0.95rem] [&_h3]:[font-weight:600] [&_p]:[margin:8px_0_0] [&_p]:[color:var(--ds-text-default)] [&_p]:[font-size:0.75rem] [&_p]:[line-height:1.55] ${isActive ? 'is-active' : ''}`}
          >
            <div className="ds-project-phase-step-topline [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-2)] [&>span:first-child]:[color:var(--ds-text-muted)] [&>span:first-child]:[font-size:0.75rem] [&>span:first-child]:[font-weight:600] [&>span:first-child]:[letter-spacing:normal]">
              <span>{index + 1}</span>
              {isActive && (
                <span className="ds-project-phase-active-badge [display:inline-flex] [align-items:center] [width:fit-content] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-default)] [font-size:0.6875rem] [font-weight:600] [letter-spacing:normal] [text-transform:none] [padding:5px_8px] [border-color:var(--ds-border-strong)] [background:var(--ds-bg-elevated-strong)] [color:var(--ds-accent-strong)] [font-size:0.625rem]">
                  Aktiv
                </span>
              )}
            </div>
            <h3>{step.label}</h3>
            <p>{step.desc}</p>
          </div>
        );
      })}
    </div>
  );
};
