import React, { useState } from 'react';
import { useRouter } from 'next/router';

interface Project {
  id: string;
  title: string;
  category: string;
  startQuarter: string;
  endQuarter: string;
  description: string;
  status: 'completed' | 'in-progress' | 'planned';
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface ProjectTimelineProps {
  projects: Project[];
  categories: Category[];
  currentYear: number;
}

const getQuarterPosition = (quarter: string): number => {
  switch (quarter) {
    case 'Q1':
      return 0;
    case 'Q2':
      return 25;
    case 'Q3':
      return 50;
    case 'Q4':
      return 75;
    default:
      return 0;
  }
};

const getQuarterWidth = (startQuarter: string, endQuarter: string): number => {
  const start = getQuarterPosition(startQuarter);
  const end = getQuarterPosition(endQuarter);
  return end - start + 25;
};

// Function to check if two projects overlap in time
const projectsOverlap = (p1: Project, p2: Project): boolean => {
  const p1Start = getQuarterPosition(p1.startQuarter);
  const p1End = getQuarterPosition(p1.endQuarter) + 25;
  const p2Start = getQuarterPosition(p2.startQuarter);
  const p2End = getQuarterPosition(p2.endQuarter) + 25;

  return p1Start < p2End && p1End > p2Start;
};

const ProjectTimeline: React.FC<ProjectTimelineProps> = ({ projects, categories }) => {
  const router = useRouter();

  // State for custom tooltip
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  // Sort projects by start date and then by duration (longer projects first)
  const sortedProjects = [...projects].sort((a, b) => {
    const aStart = getQuarterPosition(a.startQuarter);
    const bStart = getQuarterPosition(b.startQuarter);
    if (aStart !== bStart) return aStart - bStart;

    const aWidth = getQuarterWidth(a.startQuarter, a.endQuarter);
    const bWidth = getQuarterWidth(b.startQuarter, b.endQuarter);
    return bWidth - aWidth; // Longer projects first
  });

  // Assign row positions to avoid overlaps
  const projectsWithRows: { project: Project; row: number }[] = [];

  sortedProjects.forEach((project) => {
    let row = 0;

    // Find the first available row where this project doesn't overlap with any existing project
    while (projectsWithRows.some((p) => p.row === row && projectsOverlap(p.project, project))) {
      row++;
    }

    projectsWithRows.push({ project, row });
  });

  const handleProjectClick = (projectId: string) => {
    router.push(`/project/${projectId}`);
  };

  const handleMouseEnter = (
    e: React.MouseEvent,
    project: Project,
    category: Category | undefined
  ) => {
    // Get the mouse position
    const x = e.clientX;
    const y = e.clientY;

    // Set the active project and tooltip position
    setActiveProject(project);
    setActiveCategory(category || null);
    setTooltipPosition({ x, y });
    setTooltipVisible(true);

    // Apply hover styles to the target
    const target = e.currentTarget as HTMLDivElement;
    target.style.transform = 'translateY(-4px) scale(1.02)';
    target.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.3)';
    target.style.zIndex = '50';
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    // Hide the tooltip
    setTooltipVisible(false);
    setActiveProject(null);
    setActiveCategory(null);

    // Reset hover styles
    const target = e.currentTarget as HTMLDivElement;
    target.style.transform = '';
    target.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
    target.style.zIndex = '10';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Update tooltip position as mouse moves
    if (tooltipVisible) {
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    }
  };

  return (
    <div className="mt-3 relative min-h-[500px] w-full">
      {projectsWithRows.map(({ project, row }) => {
        const category = categories.find((c) => c.id === project.category);
        const startPosition = getQuarterPosition(project.startQuarter);
        const width = getQuarterWidth(project.startQuarter, project.endQuarter);
        return (
          <div
            key={project.id}
            className="absolute w-full h-10"
            style={{ top: `${row * 50}px` }} // 50px spacing between rows
          >
            <div
              className="absolute h-10 rounded flex items-center px-3 cursor-pointer overflow-hidden whitespace-nowrap text-ellipsis shadow-md transition-all duration-300 text-white"
              style={{
                left: `${startPosition}%`,
                width: `${width}%`,
                backgroundColor: category?.color || '#64748b',
                borderLeft: `4px solid ${category?.color || '#999'}`,
                zIndex: 10, // Base z-index for all projects
              }}
              onMouseEnter={(e) => handleMouseEnter(e, project, category)}
              onMouseLeave={handleMouseLeave}
              onMouseMove={handleMouseMove}
              onClick={() => handleProjectClick(project.id)}
            >
              {project.title}
            </div>
          </div>
        );
      })}

      {/* Custom tooltip */}
      {tooltipVisible && activeProject && (
        <div
          className="fixed bg-gray-800 text-white p-3 rounded-lg border border-gray-700 shadow-lg z-[1000] pointer-events-none"
          style={{
            left: tooltipPosition.x + 10, // Offset slightly from cursor
            top: tooltipPosition.y + 10,
            maxWidth: '300px',
            transform: 'translate(0, 0)', // Ensure no automatic centering
          }}
        >
          <div className="font-bold mb-1 text-white">{activeProject.title}</div>
          <div className="mb-1 italic text-gray-300">
            {activeCategory?.name} • {activeProject.startQuarter} to {activeProject.endQuarter}
          </div>
          <div className="text-sm leading-tight text-gray-200">{activeProject.description}</div>
        </div>
      )}
    </div>
  );
};

export default ProjectTimeline;
