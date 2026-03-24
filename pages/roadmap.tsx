import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import Roadmap from '../components/Roadmap';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { clientDataService } from '@/utils/clientDataService';
import { extractAdminSessionFromHeaders } from '@/utils/apiAuth';
import { isReadSessionAllowedForInstance } from '@/utils/instanceAccessServer';
import { INSTANCE_QUERY_PARAM, setInstanceCookieHeader } from '@/utils/instanceConfig';
import {
  resolveFirstAllowedInstanceForAdminSession,
  resolveInstanceForAdminSession,
} from '@/utils/instanceSelection';
import type { Category, Project } from '../types';

type RoadmapPageProps = {
  projects: Project[];
  categories: Category[];
  resolvedInstanceSlug: string;
  accessDenied?: boolean;
};

const RoadmapPage: React.FC<RoadmapPageProps> = ({
  projects,
  categories,
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
    return resolvedInstanceSlug;
  }, [resolvedInstanceSlug, router.isReady, router.query]);

  const [projectsState, setProjectsState] = useState<Project[]>(projects);
  const [categoriesState, setCategoriesState] = useState<Category[]>(categories);
  const [accessDeniedState, setAccessDeniedState] = useState(Boolean(accessDenied));
  const [activeInstanceSlug, setActiveInstanceSlug] = useState(resolvedInstanceSlug);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setProjectsState(projects);
    setCategoriesState(categories);
    setAccessDeniedState(Boolean(accessDenied));
    setActiveInstanceSlug(resolvedInstanceSlug);
    setLoading(false);
  }, [accessDenied, categories, projects, resolvedInstanceSlug]);

  useEffect(() => {
    if (!router.isReady) return;
    if (currentInstanceSlug === activeInstanceSlug) return;

    const requestId = ++fetchRequestIdRef.current;
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);

      const projectsUrl = currentInstanceSlug
        ? `/api/projects?${INSTANCE_QUERY_PARAM}=${encodeURIComponent(currentInstanceSlug)}`
        : '/api/projects';
      const categoriesUrl = currentInstanceSlug
        ? `/api/categories?${INSTANCE_QUERY_PARAM}=${encodeURIComponent(currentInstanceSlug)}`
        : '/api/categories';

      try {
        const [projectsResp, categoriesResp] = await Promise.all([
          fetch(projectsUrl, {
            credentials: 'same-origin',
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          }),
          fetch(categoriesUrl, {
            credentials: 'same-origin',
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          }),
        ]);

        if (projectsResp.status === 401 || categoriesResp.status === 401) {
          if (controller.signal.aborted || requestId !== fetchRequestIdRef.current) return;
          const returnUrl = typeof router.asPath === 'string' ? router.asPath : '/roadmap';
          void router.push(`/admin/login?returnUrl=${encodeURIComponent(returnUrl)}`);
          return;
        }

        if (projectsResp.status === 403 || categoriesResp.status === 403) {
          if (controller.signal.aborted || requestId !== fetchRequestIdRef.current) return;
          setProjectsState([]);
          setCategoriesState([]);
          setAccessDeniedState(true);
          setActiveInstanceSlug(currentInstanceSlug);
          return;
        }

        if (!projectsResp.ok || !categoriesResp.ok) {
          const projectPayload = await projectsResp.json().catch(() => null);
          const categoryPayload = await categoriesResp.json().catch(() => null);
          throw new Error(
            projectPayload?.error ||
              categoryPayload?.error ||
              `Failed to fetch roadmap data (${projectsResp.status}/${categoriesResp.status})`
          );
        }

        const [nextProjects, nextCategories] = await Promise.all([
          projectsResp.json(),
          categoriesResp.json(),
        ]);

        if (controller.signal.aborted || requestId !== fetchRequestIdRef.current) return;

        setProjectsState(Array.isArray(nextProjects) ? nextProjects : []);
        setCategoriesState(Array.isArray(nextCategories) ? nextCategories : []);
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
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <SiteHeader activeRoute="roadmap" />
      <main className="flex-1 pt-12">
        {loading ? (
          <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 shadow-xl shadow-slate-950/40">
              <h1 className="text-lg font-semibold text-white">Lade Roadmap …</h1>
              <p className="mt-3 text-sm text-slate-300">
                Projekte werden für die ausgewählte Instanz geladen.
              </p>
            </div>
          </div>
        ) : accessDeniedState ? (
          <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 shadow-xl shadow-slate-950/40">
              <h1 className="text-xl font-semibold text-white">Kein Zugriff</h1>
              <p className="mt-3 text-sm text-slate-200">
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
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default RoadmapPage;

export const getServerSideProps: GetServerSideProps<RoadmapPageProps> = async (ctx) => {
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

    const session = extractAdminSessionFromHeaders({
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
      return {
        props: {
          projects: [],
          categories: [],
          resolvedInstanceSlug: instance.slug,
          accessDenied: true,
        },
      };
    }

    const [projects, categories] = await clientDataService.withRequestHeaders(
      forwardedHeaders,
      () =>
        clientDataService.withInstance(instance.slug, () =>
          Promise.all([clientDataService.getAllProjects(), clientDataService.getAllCategories()])
        )
    );

    const safeProjects = Array.isArray(projects) ? projects : [];
    const safeCategories = Array.isArray(categories) ? categories : [];

    return {
      props: {
        projects: safeProjects,
        categories: safeCategories,
        resolvedInstanceSlug: instance.slug,
      },
    };
  } catch (error) {
    console.error('[roadmap] getServerSideProps failed', error);
    return {
      props: { projects: [], categories: [], resolvedInstanceSlug: '', accessDenied: false },
    };
  }
};
