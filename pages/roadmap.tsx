import { useEffect, useState } from 'react';
import Roadmap from '../components/Roadmap';
import { Project } from '../types';
import JSDoITLoader from '../components/JSDoITLoader';

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
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <JSDoITLoader />
      </div>
    );
  }

  return <Roadmap initialProjects={projects} />;
};

export default RoadmapPage;
