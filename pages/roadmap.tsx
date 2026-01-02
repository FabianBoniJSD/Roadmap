import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Roadmap from '../components/Roadmap';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import InstanceSwitcher from '@/components/InstanceSwitcher';
import { clientDataService } from '@/utils/clientDataService';
import { getInstanceConfigFromRequest, setInstanceCookieHeader } from '@/utils/instanceConfig';
import type { Project } from '../types';

type RoadmapPageProps = {
  projects: Project[];
};

const RoadmapPage: React.FC<RoadmapPageProps> = ({ projects }) => {
  const [projectsState, setProjectsState] = useState<Project[]>(projects);

  useEffect(() => {
    // Keep client state in sync if SSR provided data changes (e.g., hot reload)
    setProjectsState(projects);
  }, [projects]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <SiteHeader activeRoute="roadmap" />
      <div className="flex justify-end px-4 pt-4 sm:px-6 lg:px-8">
        <InstanceSwitcher />
      </div>
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
