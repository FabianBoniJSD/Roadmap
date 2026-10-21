import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { performance } from 'node:perf_hooks';
import Roadmap from '../components/Roadmap';
import SiteHeader from '@/components/SiteHeader';
import { extractAdminSessionFromHeaders } from '@/utils/apiAuth';
import {
  isAdminSessionAllowedForInstance,
  isReadSessionAllowedForInstance,
} from '@/utils/instanceAccessServer';
import { INSTANCE_QUERY_PARAM, setInstanceCookieHeader } from '@/utils/instanceConfig';
import { buildInstanceAwareUrl } from '@/utils/auth';
import {
  resolveFirstAllowedInstanceForAdminSession,
  resolveInstanceForAdminSession,
} from '@/utils/instanceSelection';
import { getRoadmapDataSnapshot } from '@/utils/roadmapData';
import { DEFAULT_THEME, type ThemeSettings } from '@/utils/theme';
import type { Category, Project, ProjectOrderByCategory } from '../types';

const INSTANCE_CONTEXT_CHANGED_EVENT = 'roadmap-instance-changed';

type RoadmapPageProps = {
  projects: Project[];
  categories: Category[];
  projectOrderByCategory: ProjectOrderByCategory;
  theme: ThemeSettings;
  isAdmin: boolean;
  resolvedInstanceSlug: string;
  accessDenied?: boolean;
};

const RoadmapPage: React.FC<RoadmapPageProps> = ({
  projects,
  categories,
  projectOrderByCategory,
  theme,
  isAdmin,
  resolvedInstanceSlug,
  accessDenied,
}) => {
  const router = useRouter();
  const fetchRequestIdRef = useRef(0);
  const currentInstanceSlug = useMemo(() => {
    const raw = router.query?.[INSTANCE_QUERY_PARAM];
    if (!router.isReady) return resolvedInstanceSlug;
    if (Array.isArray(raw)) return raw[0] ?? '';
    if (typeof raw === 'string' && raw) return raw;
    if (resolvedInstanceSlug) return resolvedInstanceSlug;
    if (typeof window !== 'undefined') {
      const match = document.cookie.match(
        new RegExp(`(?:^|;\\s*)roadmap-instance=([^;\\s]+)`, 'i')
      );
      if (match?.[1]) {
        try {
          return decodeURIComponent(match[1]);
        } catch {
          return match[1];
        }
      }
    }
    return '';
  }, [resolvedInstanceSlug, router.isReady, router.query]);

  const [projectsState, setProjectsState] = useState<Project[]>(projects);
  const [categoriesState, setCategoriesState] = useState<Category[]>(categories);
  const [projectOrderByCategoryState, setProjectOrderByCategoryState] =
    useState<ProjectOrderByCategory>(projectOrderByCategory);
  const [themeState, setThemeState] = useState(theme);
  const [isAdminState, setIsAdminState] = useState(isAdmin);
  const [accessDeniedState, setAccessDeniedState] = useState(Boolean(accessDenied));
  const [activeInstanceSlug, setActiveInstanceSlug] = useState(resolvedInstanceSlug);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setProjectsState(projects);
    setCategoriesState(categories);
    setProjectOrderByCategoryState(projectOrderByCategory);
    setThemeState(theme);
    setIsAdminState(isAdmin);
    setAccessDeniedState(Boolean(accessDenied));
    setActiveInstanceSlug(resolvedInstanceSlug);
    setLoading(false);
  }, [
    accessDenied,
    categories,
    isAdmin,
    projectOrderByCategory,
    projects,
    resolvedInstanceSlug,
    theme,
  ]);

  useEffect(() => {
    if (!currentInstanceSlug || typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    try {
      const desired = encodeURIComponent(currentInstanceSlug);
      const cookies = document.cookie || '';
      const match = cookies.match(new RegExp('(?:^|;\\s*)roadmap-instance=([^;\\s]+)', 'i'));
      const current = match?.[1] ?? '';
      if (current !== desired) {
        document.cookie = `roadmap-instance=${desired}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
        window.dispatchEvent(new Event(INSTANCE_CONTEXT_CHANGED_EVENT));
      }
    } catch {
      // ignore cookie sync issues and keep page functional
    }
  }, [currentInstanceSlug]);

  useEffect(() => {
    if (!router.isReady) return;
    if (currentInstanceSlug === activeInstanceSlug) return;

    const requestId = ++fetchRequestIdRef.current;
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);

      const roadmapDataUrl = buildInstanceAwareUrl(
        currentInstanceSlug
          ? `/api/roadmap-data?${INSTANCE_QUERY_PARAM}=${encodeURIComponent(currentInstanceSlug)}`
          : '/api/roadmap-data'
      );

      try {
        const response = await fetch(roadmapDataUrl, {
          credentials: 'same-origin',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        if (response.status === 401) {
          if (controller.signal.aborted || requestId !== fetchRequestIdRef.current) return;
          const returnUrl = typeof router.asPath === 'string' ? router.asPath : '/roadmap';
          void router.push(`/admin/login?returnUrl=${encodeURIComponent(returnUrl)}`);
          return;
        }

        if (response.status === 403) {
          if (controller.signal.aborted || requestId !== fetchRequestIdRef.current) return;
          setProjectsState([]);
          setCategoriesState([]);
          setProjectOrderByCategoryState({});
          setAccessDeniedState(true);
          setActiveInstanceSlug(currentInstanceSlug);
          return;
        }

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          throw new Error(
            errorPayload?.error || `Failed to fetch roadmap data (${response.status})`
          );
        }

        const payload = await response.json();

        if (controller.signal.aborted || requestId !== fetchRequestIdRef.current) return;

        setProjectsState(Array.isArray(payload.projects) ? payload.projects : []);
        setCategoriesState(Array.isArray(payload.categories) ? payload.categories : []);
        setProjectOrderByCategoryState(payload.projectOrderByCategory || {});
        setThemeState(payload.theme || DEFAULT_THEME);
        setIsAdminState(Boolean(payload.access?.isAdmin));
        setAccessDeniedState(false);
        setActiveInstanceSlug(currentInstanceSlug);
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') return;
        console.error('[roadmap] client recovery fetch failed', error);
      } finally {
        if (controller.signal.aborted || requestId !== fetchRequestIdRef.current) return;
        setLoading(false);
      }
    };

    void run();
    return () => controller.abort();
  }, [activeInstanceSlug, currentInstanceSlug, router, router.isReady]);

  return (
    <>
      <Head>
        <title>Roadmap | JSDoIT Roadmap</title>
      </Head>
      <div className="ds-page-shell before:[position:absolute] before:[inset:0] before:[z-index:0] before:[pointer-events:none] before:[background-size:56px_56px] after:[position:absolute] after:[right:-10%] after:[bottom:-25%] after:[left:-10%] after:[z-index:0] after:[height:38vh] after:[pointer-events:none] [position:relative] [isolation:isolate] [display:flex] [min-height:100vh] [flex-direction:column] [overflow:hidden] [background:var(--ds-bg-page)] [color:var(--ds-text-default)] [font-family:var(--ds-font-sans)] [&>*]:[position:relative] [&>*]:[z-index:1]">
        <SiteHeader activeRoute="roadmap" authenticated initialIsAdmin={isAdminState} />

        <main className="ds-page-main [flex:1] ds-roadmap-page-main [padding-block:clamp(26px,_4vw,_48px)_88px] max-[760px]:[padding-top:var(--ds-space-5)]">
          {loading ? (
            <div className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-roadmap-state [padding-block:clamp(48px,_9vw,_96px)]">
              <div className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-roadmap-state-card [max-width:760px] [padding:clamp(24px,_4vw,_36px)] [border-radius:var(--ds-radius-xl)] [&.is-warning]:[border-color:color-mix(in_srgb,_var(--ds-warning)_46%,_var(--ds-border-default))] [&.is-warning]:[background:var(--ds-bg-elevated-strong)] [&_h1]:[margin:0] [&_h1]:[color:var(--ds-text-strong)] [&_h1]:[font-size:clamp(1.25rem,_3vw,_1.75rem)] [&_p]:[margin:12px_0_0] [&_p]:[color:var(--ds-text-default)] [&_p]:[line-height:1.65]">
                <h1>Lade Roadmap ...</h1>
                <p>Projekte werden für die ausgewählte Instanz geladen.</p>
              </div>
            </div>
          ) : accessDeniedState ? (
            <div className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-roadmap-state [padding-block:clamp(48px,_9vw,_96px)]">
              <div className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-roadmap-state-card [max-width:760px] [padding:clamp(24px,_4vw,_36px)] [border-radius:var(--ds-radius-xl)] [&.is-warning]:[border-color:color-mix(in_srgb,_var(--ds-warning)_46%,_var(--ds-border-default))] [&.is-warning]:[background:var(--ds-bg-elevated-strong)] [&_h1]:[margin:0] [&_h1]:[color:var(--ds-text-strong)] [&_h1]:[font-size:clamp(1.25rem,_3vw,_1.75rem)] [&_p]:[margin:12px_0_0] [&_p]:[color:var(--ds-text-default)] [&_p]:[line-height:1.65] is-warning">
                <h1>Kein Zugriff</h1>
                <p>
                  Du hast keinen Zugriff auf diese Roadmap-Instanz. Sichtbarkeit wird pro Instanz
                  anhand deiner Abteilung oder expliziter Admin-Berechtigungen gesteuert.
                </p>
              </div>
            </div>
          ) : (
            <Roadmap
              key={activeInstanceSlug || resolvedInstanceSlug || 'default'}
              initialProjects={projectsState}
              initialCategories={categoriesState}
              initialProjectOrderByCategory={projectOrderByCategoryState}
              initialTheme={themeState}
              initialIsAdmin={isAdminState}
            />
          )}
        </main>

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

export default RoadmapPage;

export const getServerSideProps: GetServerSideProps<RoadmapPageProps> = async (ctx) => {
  const startedAt = performance.now();
  const timingMarks: string[] = [];
  const markTiming = (name: string, since: number) => {
    timingMarks.push(`${name};dur=${Math.max(0, performance.now() - since).toFixed(1)}`);
    ctx.res?.setHeader('Server-Timing', timingMarks.join(', '));
  };

  try {
    if (ctx.res) {
      ctx.res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      ctx.res.setHeader('Pragma', 'no-cache');
      ctx.res.setHeader('Expires', '0');
      ctx.res.setHeader('Surrogate-Control', 'no-store');
      const existingVary = ctx.res.getHeader('Vary');
      const varyValues = new Set(
        String(existingVary || '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      );
      varyValues.add('Cookie');
      varyValues.add('Authorization');
      ctx.res.setHeader('Vary', Array.from(varyValues).join(', '));
    }

    const session = await extractAdminSessionFromHeaders({
      authorization: ctx.req.headers.authorization,
      cookie: ctx.req.headers.cookie,
    });
    const forwardedHeaders = {
      authorization:
        typeof ctx.req.headers.authorization === 'string'
          ? ctx.req.headers.authorization
          : undefined,
      cookie: typeof ctx.req.headers.cookie === 'string' ? ctx.req.headers.cookie : undefined,
    };
    if (!session) {
      const returnUrl = typeof ctx.resolvedUrl === 'string' ? ctx.resolvedUrl : '/roadmap';
      return {
        redirect: {
          destination: `/admin/login?returnUrl=${encodeURIComponent(returnUrl)}`,
          permanent: false,
        },
      };
    }

    const instance = await resolveInstanceForAdminSession(ctx.req, session);
    if (!instance) {
      return {
        redirect: { destination: '/', permanent: false },
      };
    }

    // Persist cookie early so subsequent reloads keep the same instance
    if (ctx.res) {
      ctx.res.setHeader('Set-Cookie', setInstanceCookieHeader(instance.slug));
    }

    const accessStartedAt = performance.now();
    const canRead = await isReadSessionAllowedForInstance({
      session,
      instance,
      requestHeaders: forwardedHeaders,
    });
    markTiming('access', accessStartedAt);
    if (!canRead) {
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
      return {
        props: {
          projects: [],
          categories: [],
          projectOrderByCategory: {},
          theme: DEFAULT_THEME,
          isAdmin: false,
          resolvedInstanceSlug: instance.slug,
          accessDenied: true,
        },
      };
    }

    const dataStartedAt = performance.now();
    const [{ snapshot, cacheStatus }, isAdmin] = await Promise.all([
      getRoadmapDataSnapshot({ instance, forwardedHeaders }),
      isAdminSessionAllowedForInstance({ session, instance, requestHeaders: forwardedHeaders }),
    ]);
    markTiming('roadmap-data', dataStartedAt);
    markTiming('total', startedAt);
    ctx.res?.setHeader('X-Roadmap-Data-Cache', cacheStatus);

    return {
      props: {
        projects: snapshot.projects,
        categories: snapshot.categories,
        projectOrderByCategory: snapshot.projectOrderByCategory,
        theme: snapshot.theme,
        isAdmin,
        resolvedInstanceSlug: instance.slug,
      },
    };
  } catch (error) {
    console.error('[roadmap] getServerSideProps failed', error);
    return {
      props: {
        projects: [],
        categories: [],
        projectOrderByCategory: {},
        theme: DEFAULT_THEME,
        isAdmin: false,
        resolvedInstanceSlug: '',
        accessDenied: false,
      },
    };
  }
};
