import { useEffect, useState } from 'react';
import Roadmap from '../components/Roadmap';
import JSDoITLoader from '../components/JSDoITLoader';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { Project } from '../types';

const RoadmapPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const resp = await fetch('/api/projects', { headers: { Accept: 'application/json' } });
        if (!resp.ok) {
          const t = await resp.text();
          console.error('Error fetching projects (API):', resp.status, resp.statusText, t);
          setProjects([]);
        } else {
          const data: Project[] = await resp.json();
          const projectArray = Array.isArray(data) ? data : [];
          setProjects(projectArray);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
        <SiteHeader activeRoute="roadmap" />
        <main className="flex flex-1 items-center justify-center pt-12">
          <JSDoITLoader message="Roadmap wird geladen …" />
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <SiteHeader activeRoute="roadmap" />
      <main className="flex-1 pt-12">
        <Roadmap initialProjects={projects} />
      </main>
      <SiteFooter />
    </div>
  );
};

export default RoadmapPage;
