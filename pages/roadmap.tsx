import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import Roadmap from '../components/Roadmap';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { clientDataService } from '@/utils/clientDataService';
import { extractAdminSessionFromHeaders } from '@/utils/apiAuth';
import { isAdminSessionAllowedForInstance } from '@/utils/instanceAccessServer';
import { INSTANCE_QUERY_PARAM, setInstanceCookieHeader } from '@/utils/instanceConfig';
import { resolveInstanceForAdminSession } from '@/utils/instanceSelection';
import type { Project } from '../types';

type RoadmapPageProps = {
  projects: Project[];
  accessDenied?: boolean;
};

const RoadmapPage: React.FC<RoadmapPageProps> = ({ projects, accessDenied }) => {
  const router = useRouter();
  const instanceSlug = useMemo(() => {
    const raw = router.query?.[INSTANCE_QUERY_PARAM];
    return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
  }, [router.query]);
  const [projectsState, setProjectsState] = useState<Project[]>(projects);

  useEffect(() => {
    // Keep client state in sync if SSR provided data changes (e.g., hot reload)
    setProjectsState(projects);
  }, [projects]);

  useEffect(() => {
    // When switching instances client-side, refetch projects immediately
    if (!router.isReady) return;
    clientDataService
      .getAllProjects()
      .then((next) => {
        if (Array.isArray(next)) setProjectsState(next);
      })
      .catch((err) => {
        console.error('[roadmap] client refetch failed after instance change', err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceSlug]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <SiteHeader activeRoute="roadmap" />
      <main className="flex-1 pt-12">
        {accessDenied ? (
          <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 shadow-xl shadow-slate-950/40">
              <h1 className="text-xl font-semibold text-white">Kein Zugriff</h1>
              <p className="mt-3 text-sm text-slate-200">
                Du hast keinen Zugriff auf eine Roadmap-Instanz. Bitte lasse dir eine Gruppe im
                Format <span className="font-mono">admin-&lt;instanz&gt;</span> (z.B.
                <span className="font-mono"> admin-bdm-projects</span>) zuweisen oder verwende die
                Gruppe <span className="font-mono">superadmin</span> für Vollzugriff.
              </p>
            </div>
          </div>
        ) : (
          <Roadmap initialProjects={projectsState} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default RoadmapPage;

export const getServerSideProps: GetServerSideProps<RoadmapPageProps> = async (ctx) => {
  try {
    const session = extractAdminSessionFromHeaders({
      authorization: ctx.req.headers.authorization,
      cookie: ctx.req.headers.cookie,
    });
    if (!session?.isAdmin) {
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

    if (!(await isAdminSessionAllowedForInstance({ session, instance }))) {
      return {
        props: {
          projects: [],
          accessDenied: true,
        },
      };
    }

    const projects = await clientDataService.withInstance(instance.slug, () =>
      clientDataService.getAllProjects()
    );

    const safeProjects = Array.isArray(projects) ? projects : [];

    return {
      props: {
        projects: safeProjects,
      },
    };
  } catch (error) {
    console.error('[roadmap] getServerSideProps failed', error);
    return {
      props: { projects: [] },
    };
  }
};
