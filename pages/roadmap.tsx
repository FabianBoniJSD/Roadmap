import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import Roadmap from '../components/Roadmap';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { clientDataService } from '@/utils/clientDataService';
import { extractAdminSessionFromHeaders } from '@/utils/apiAuth';
import {
  getInstanceConfigFromRequest,
  INSTANCE_QUERY_PARAM,
  setInstanceCookieHeader,
} from '@/utils/instanceConfig';
import type { Project } from '../types';

type RoadmapPageProps = {
  projects: Project[];
};

const RoadmapPage: React.FC<RoadmapPageProps> = ({ projects }) => {
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
        <Roadmap initialProjects={projectsState} />
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

    const instance = await getInstanceConfigFromRequest(ctx.req, { fallbackToDefault: true });
    if (!instance) {
      return {
        redirect: { destination: '/', permanent: false },
      };
    }

    const projects = await clientDataService.withInstance(instance.slug, () =>
      clientDataService.getAllProjects()
    );

    // Persist cookie so subsequent client requests carry the active instance
    if (ctx.res) {
      ctx.res.setHeader('Set-Cookie', setInstanceCookieHeader(instance.slug));
    }

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
