import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import RoadmapYearNavigation from './RoadmapYearNavigation';
import { Category, Project } from '../types';
import { clientDataService } from '../utils/clientDataService';
import CategorySidebar from './CategorySidebar';
import Footer from './Footer';
import { FaBars, FaTimes } from 'react-icons/fa';
import Nav from './Nav';
import { loadThemeSettings } from '../utils/theme';
import StatusLegend from './StatusLegend';

interface RoadmapProps {
  initialProjects: Project[];
}

const Roadmap: React.FC<RoadmapProps> = ({ initialProjects }) => {
  const router = useRouter();
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [displayedProjects, setDisplayedProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [hoveredProject, setHoveredProject] = useState<Project | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [viewType, setViewType] = useState<'quarters' | 'months' | 'weeks'>('quarters');
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [siteTitle, setSiteTitle] = useState('IT + Digital Roadmap');
  const [themeColors, setThemeColors] = useState<{gradientFrom:string;gradientTo:string}>({gradientFrom:'#eab308',gradientTo:'#b45309'});
  const [showLegend, setShowLegend] = useState(true);

  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setMobileCategoriesOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Laden des Site-Titels beim Mounten der Komponente
  const loadAppTitle = async () => {
      try {
    const theme = await loadThemeSettings();
    setSiteTitle(theme.siteTitle || 'IT + Digital Roadmap');
    setThemeColors({ gradientFrom: theme.gradientFrom, gradientTo: theme.gradientTo });
      } catch (error) {
        console.error('Fehler beim Laden des Site-Titels:', error);
      }
    };

    loadAppTitle();
  }, []);

  // Hilfsfunktion zum Extrahieren des Jahres aus einem ISO-Datumsstring
  const getYearFromISOString = (isoString: string): number => {
    const date = new Date(isoString);
    return !isNaN(date.getTime()) ? date.getFullYear() : currentYear;
  };

  // Hilfsfunktion zum Extrahieren des Quartals aus einem Datum
  const getQuarterFromDate = (date: Date): number => {
    return Math.floor(date.getMonth() / 3) + 1;
  };

  // Fetch categories and filter projects based on the selected year
  useEffect(() => {
    // Filter projects based on year
    const filteredProjects = initialProjects.filter(project => {
      if (!project.startDate || !project.endDate) {
        return false; // Ignoriere Projekte ohne Datumsangaben
      }

      const startYear = getYearFromISOString(project.startDate);
      const endYear = getYearFromISOString(project.endDate);

      return startYear <= currentYear && endYear >= currentYear;
    });

    setDisplayedProjects(filteredProjects);

    // Fetch categories
    const fetchCategories = async () => {
      try {
        const categoriesData = await clientDataService.getAllCategories();
        setCategories(categoriesData);
        // Initially set all categories as active
        setActiveCategories(categoriesData.map(c => c.id));
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, [currentYear, initialProjects]);

  // Debugging-Ausgaben
  useEffect(() => {
    console.log('Initial projects:', initialProjects);
    console.log('Displayed projects:', displayedProjects);
    console.log('Active categories:', activeCategories);
  }, [initialProjects, displayedProjects, activeCategories]);

  const toggleCategory = (categoryId: string) => {
    if (activeCategories.includes(categoryId)) {
      setActiveCategories(activeCategories.filter(id => id !== categoryId));
    } else {
      setActiveCategories([...activeCategories, categoryId]);
    }
  };

  // Filter projects by active categories
  const filteredProjects = displayedProjects.filter(project =>
    activeCategories.includes(project.category)
  );

  // Get category name by ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  // Get category color by ID
  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || '#777777';
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed': return '#10B981'; // green-500
      case 'in-progress': return '#3B82F6'; // blue-500
      case 'planned': return '#6B7280'; // gray-500
      case 'paused': return '#F59E0B'; // yellow-500
      case 'cancelled': return '#EF4444'; // red-500
      default: return '#6B7280'; // gray-500
    }
  };

  // Tag color helper (deterministic fallback hashing)
  const tagPalette = [
    '#059669','#6366F1','#DB2777','#0EA5E9','#D97706','#9333EA','#16A34A','#F43F5E','#0891B2','#7C3AED'
  ];
  const specialTagColors: Record<string,string> = {
    'm365':'#059669',
    'rpa':'#6366F1',
    'ai':'#9333EA',
    'cloud':'#0EA5E9',
    'security':'#DB2777'
  };
  const getTagColor = (tag: string): string => {
    const key = tag.trim().toLowerCase();
    if (specialTagColors[key]) return specialTagColors[key];
    let hash = 0; for (let i=0;i<key.length;i++) hash = ((hash<<5)-hash)+key.charCodeAt(i);
    const idx = Math.abs(hash) % tagPalette.length; return tagPalette[idx];
  };

  // Handle mouse over for project tooltip
  const handleMouseOver = (e: React.MouseEvent, project: Project) => {
    setHoveredProject(project);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };

  // Handle mouse leave for project tooltip
  const handleMouseLeave = () => {
    setHoveredProject(null);
  };

  // Handle clicks on projects
  const handleProjectClick = (projectId: string) => {
    router.push(`/project/${projectId}`);
  };

  // Calculate position for quarter view
  const calculateQuarterPosition = (project: Project): { startPosition: number, width: number } => {
    if (!project.startDate || !project.endDate) {
      return { startPosition: 0, width: 0 };
    }

    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { startPosition: 0, width: 0 };
    }

    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const startQuarter = getQuarterFromDate(startDate);
    const endQuarter = getQuarterFromDate(endDate);

    let startPosition = 0;
    let width = 0;

    if (startYear < currentYear) {
      // Project started before current year
      startPosition = 0;
    } else if (startYear === currentYear) {
      // Project starts in current year
      startPosition = (startQuarter - 1) * 25;
    }

    if (endYear > currentYear) {
      // Project ends after current year
      width = 100 - startPosition;
    } else if (endYear === currentYear) {
      // Project ends in current year
      width = endQuarter * 25 - startPosition;
    }

    return { startPosition, width };
  };

  // Calculate position for month view
  const calculateMonthPosition = (project: Project): { startPosition: number, width: number } => {
    if (!project.startDate || !project.endDate) {
      return { startPosition: 0, width: 0 };
    }

    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { startPosition: 0, width: 0 };
    }

    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const startMonth = startDate.getMonth();
    const endMonth = endDate.getMonth();

    let startPosition = 0;
    let width = 0;

    if (startYear < currentYear) {
      // Project started before current year
      startPosition = 0;
    } else if (startYear === currentYear) {
      // Project starts in current year
      startPosition = (startMonth / 12) * 100;
    }

    if (endYear > currentYear) {
      // Project ends after current year
      width = 100 - startPosition;
    } else if (endYear === currentYear) {
      // Project ends in current year
      width = ((endMonth + 1) / 12) * 100 - startPosition;
    }

    return { startPosition, width };
  };

  // Calculate position for week view
  const calculateWeekPosition = (project: Project): { startPosition: number, width: number } => {
    if (!project.startDate || !project.endDate) {
      return { startPosition: 0, width: 0 };
    }

    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { startPosition: 0, width: 0 };
    }

    // Berechne die Wochennummer (ungefähr)
    const getWeekNumber = (date: Date): number => {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    };

    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const startWeek = getWeekNumber(startDate);
    const endWeek = getWeekNumber(endDate);

    let startPosition = 0;
    let width = 0;

    if (startYear < currentYear) {
      // Project started before current year
      startPosition = 0;
    } else if (startYear === currentYear) {
      // Project starts in current year
      startPosition = ((startWeek - 1) / 52) * 100;
    }

    if (endYear > currentYear) {
      // Project ends after current year
      width = 100 - startPosition;
    } else if (endYear === currentYear) {
      // Project ends in current year
      width = (endWeek / 52) * 100 - startPosition;
    }

    return { startPosition, width };
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <div className="min-h-screen pt-20 px-4 md:px-8 lg:px-20 font-sans bg-gray-900 text-white overflow-hidden p-0 m-0">
        <header className="w-full flex flex-row justify-between py-4 md:py-8 px-4 md:px-10">
          <h1 className="text-3xl md:text-5xl font-bold m-0 uppercase tracking-wider bg-clip-text text-transparent shadow-xl" style={{ backgroundImage: `linear-gradient(to right, ${themeColors.gradientFrom}, ${themeColors.gradientTo})` }}>
            {siteTitle}
          </h1>
          <Nav currentPage="roadmap" />
        </header>

        {/* Controls section - View type and Year navigation */}
  <div className="flex flex-col md:flex-row justify-between items-center p-2 px-4 md:px-10 mb-4 gap-4">
          {/* View type buttons - Bigger and more mobile-friendly */}
          <div className="flex space-x-2 w-full md:w-auto">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-lg flex-1 md:flex-none ${viewType === 'quarters' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
              onClick={() => setViewType('quarters')}
            >
              Quartale
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-lg flex-1 md:flex-none ${viewType === 'months' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
              onClick={() => setViewType('months')}
            >
              Monate
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-lg flex-1 md:flex-none ${viewType === 'weeks' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
              onClick={() => setViewType('weeks')}
            >
              Wochen
            </button>
          </div>

          {/* Year navigation - Responsive */}
          <div className="w-full md:w-auto flex justify-center md:justify-end gap-4 items-center flex-wrap">
            <RoadmapYearNavigation
              initialYear={currentYear}
              onYearChange={setCurrentYear}
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLegend(v => !v)}
                className="text-xs md:text-sm px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 border border-gray-600"
              >
                {showLegend ? 'Legende ausblenden' : 'Legende anzeigen'}
              </button>
              {showLegend && <StatusLegend />}
            </div>
          </div>
        </div>

        {/* Mobile categories toggle button */}
        <div className="md:hidden mb-4 px-4">
          <button
            onClick={() => setMobileCategoriesOpen(!mobileCategoriesOpen)}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-lg flex justify-between items-center"
          >
            <span>Kategorien {activeCategories.length}/{categories.length}</span>
            {mobileCategoriesOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {/* Responsive layout - stack on mobile, side-by-side on larger screens */}
        <div className="flex flex-col md:flex-row relative">
          {/* Sidebar with categories - collapsible on mobile */}
          <div
            ref={sidebarRef}
            className={`md:w-64 mb-4 md:mb-0 ${mobileCategoriesOpen ? 'block' : 'hidden'} md:block z-20 bg-gray-900 md:bg-transparent md:static absolute top-0 left-0 right-0 p-4 md:p-0`}
          >
            <CategorySidebar
              categories={categories}
              activeCategories={activeCategories}
              onToggleCategory={toggleCategory}
            />
          </div>

          {/* Main content area */}
          <div className="flex-1 overflow-hidden">
            <div className="overflow-x-auto pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className={`min-w-full ${viewType === 'months' || viewType === 'weeks' ? 'md:min-w-[800px]' : ''}`}>
                {/* Quarter/Month/Week headers */}
                {viewType === 'quarters' ? (
                  <div className="grid grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
                    <div
                      className="p-2 md:p-3 rounded-lg text-center font-semibold text-xs md:text-sm"
                      style={{ background: 'linear-gradient(to right, #eab308, #d97706)' }}
                    >
                      Q1 {currentYear}
                    </div>
                    <div
                      className="p-2 md:p-3 rounded-lg text-center font-semibold text-xs md:text-sm"
                      style={{ background: 'linear-gradient(to right, #d97706, #ea580c)' }}
                    >
                      Q2 {currentYear}
                    </div>
                    <div
                      className="p-2 md:p-3 rounded-lg text-center font-semibold text-xs md:text-sm"
                      style={{ background: 'linear-gradient(to right, #ea580c, #c2410c)' }}
                    >
                      Q3 {currentYear}
                    </div>
                    <div
                      className="p-2 md:p-3 rounded-lg text-center font-semibold text-xs md:text-sm"
                      style={{ background: 'linear-gradient(to right, #c2410c, #b91c1c)' }}
                    >
                      Q4 {currentYear}
                    </div>
                  </div>
                ) : viewType === 'months' ? (
                  <div className="grid grid-cols-12 gap-1 md:gap-2 mb-4 md:mb-6">
                    <div className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                      style={{ background: 'linear-gradient(to right, #eab308, #e3a008)' }}>Jan</div>
                    <div className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                      style={{ background: 'linear-gradient(to right, #e3a008, #dd9107)' }}>Feb</div>
                    <div className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                      style={{ background: 'linear-gradient(to right, #dd9107, #d97706)' }}>Mär</div>
                    <div className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                      style={{ background: 'linear-gradient(to right, #d97706, #d57005)' }}>Apr</div>
                    <div className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                      style={{ background: 'linear-gradient(to right, #d57005, #d16904)' }}>Mai</div>
                    <div className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                      style={{ background: 'linear-gradient(to right, #d16904, #cc6203)' }}>Jun</div>
                    <div className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                      style={{ background: 'linear-gradient(to right, #cc6203, #c65b02)' }}>Jul</div>
                    <div className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                      style={{ background: 'linear-gradient(to right, #c65b02, #c05401)' }}>Aug</div>
                    <div className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                      style={{ background: 'linear-gradient(to right, #c05401, #ba4d01)' }}>Sep</div>
                    <div className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                      style={{ background: 'linear-gradient(to right, #ba4d01, #b44600)' }}>Okt</div>
                    <div className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                      style={{ background: 'linear-gradient(to right, #b44600, #ae3f00)' }}>Nov</div>
                    <div className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                      style={{ background: 'linear-gradient(to right, #ae3f00, #a83800)' }}>Dez</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-52 gap-0 mb-4 md:mb-6 overflow-x-auto">
                    {Array.from({ length: 52 }, (_, i) => i + 1).map(week => (
                      <div
                        key={week}
                        className="p-1 text-center font-semibold text-xs"
                        style={{
                          minWidth: '30px',
                          background: `linear-gradient(to right, 
                            hsl(${Math.max(40 - week * 0.5, 0)}, 90%, ${Math.max(50 - week * 0.3, 30)}%)
                          )`
                        }}
                      >
                        {week}
                      </div>
                    ))}
                  </div>
                )}

                {/* Project timeline bars */}
                <div className="space-y-2 md:space-y-4 relative">
                  {filteredProjects.map(project => {
                    // Use the appropriate position calculation based on view type
                    const { startPosition, width } = viewType === 'quarters'
                      ? calculateQuarterPosition(project)
                      : viewType === 'months'
                        ? calculateMonthPosition(project)
                        : calculateWeekPosition(project);

                    // Skip projects with invalid positions
                    if (width <= 0) {
                      return null;
                    }

                    return (
                      <div
                        key={project.id}
                        className="relative h-8 md:h-12 mb-1 md:mb-2"
                      >
                        {/* Background grid */}
                        <div className="absolute top-0 left-0 right-0 h-full pointer-events-none">
                          {viewType === 'quarters' ? (
                            <div className="grid grid-cols-4 gap-2 md:gap-4 h-full">
                              <div className="bg-gray-800 rounded-lg opacity-30"></div>
                              <div className="bg-gray-800 rounded-lg opacity-30"></div>
                              <div className="bg-gray-800 rounded-lg opacity-30"></div>
                              <div className="bg-gray-800 rounded-lg opacity-30"></div>
                            </div>
                          ) : viewType === 'months' ? (
                            <div className="grid grid-cols-12 gap-1 md:gap-2 h-full">
                              {Array.from({ length: 12 }, (_, i) => (
                                <div key={i} className="bg-gray-800 rounded-lg opacity-30"></div>
                              ))}
                            </div>
                          ) : (
                            <div className="grid grid-cols-52 gap-0 h-full">
                              {Array.from({ length: 52 }, (_, i) => (
                                <div key={i} className="bg-gray-800 rounded-lg opacity-30"></div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Project bar */}
                        <div
                          className="absolute top-0 h-full rounded-lg flex items-center px-1 md:px-3 cursor-pointer transition-all hover:brightness-110 group border border-white border-opacity-30 hover:border-opacity-70"
                          style={{
                            left: `${startPosition}%`,
                            width: `${width}%`,
                            backgroundColor: getCategoryColor(project.category),
                            opacity: 0.85
                          }}
                          onMouseEnter={(e) => handleMouseOver(e, project)}
                          onMouseLeave={handleMouseLeave}
                          onClick={() => handleProjectClick(project.id)}
                          onTouchStart={(e) => {
                            // Show tooltip on touch start
                            const touch = e.touches[0];
                            handleMouseOver({ clientX: touch.clientX, clientY: touch.clientY } as React.MouseEvent, project);
                          }}
                          onTouchEnd={() => {
                            // Hide tooltip after a short delay to allow for tap recognition
                            setTimeout(() => handleMouseLeave(), 500);
                          }}
                        >
                          {/* Status indicator */}
                          <div
                            className="h-2 w-2 md:h-3 md:w-3 rounded-full mr-1 md:mr-2 flex-shrink-0 border border-white border-opacity-70"
                            style={{ backgroundColor: getStatusColor(project.status) }}
                          />

                          {/* Project title with improved visibility */}
                          <div className="flex items-center gap-1 w-full overflow-hidden">
                            <span className="font-medium truncate px-1 md:px-2 py-0.5 rounded bg-black bg-opacity-40 text-white group-hover:bg-opacity-60 text-[10px] md:text-sm flex-shrink">
                              {project.title}
                            </span>
                            {/* Tags (ProjectFields) */}
                            {Array.isArray((project as any).ProjectFields) && (project as any).ProjectFields.length > 0 && (
                              <div className="ml-auto flex items-center gap-1 overflow-hidden">
                                {(project as any).ProjectFields.slice(0,3).map((tag: string) => (
                                  <span
                                    key={tag}
                                    className="hidden md:inline-block text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded-full whitespace-nowrap select-none"
                                    style={{
                                      backgroundColor: getTagColor(tag),
                                      color: '#fff',
                                      boxShadow: '0 0 0 1px rgba(255,255,255,0.15)'
                                    }}
                                    title={tag}
                                  >
                                    {tag.length > 10 ? tag.slice(0,9)+'…' : tag}
                                  </span>
                                ))}
                                {(project as any).ProjectFields.length > 3 && (
                                  <span className="hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 border border-white/20 text-gray-200" title={(project as any).ProjectFields.slice(3).join(', ')}>+{(project as any).ProjectFields.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Hover Popup (Rich Tooltip) */}
        {hoveredProject && (
          <div
            className="fixed z-50 pointer-events-none shadow-2xl rounded-xl border border-gray-700 bg-gradient-to-b from-gray-900/95 to-gray-800/95 backdrop-blur-sm text-white p-3 md:p-4 w-[300px] md:w-[360px] animate-fadeIn"
            style={{
              top: Math.min(tooltipPosition.y + 16, window.innerHeight - 380),
              left: Math.min(tooltipPosition.x + 16, window.innerWidth - 380),
            }}
          >
            {/* Header */}
            <div className="flex flex-col gap-1 mb-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-snug text-sm md:text-base flex-1 pr-2">
                  {hoveredProject.title}
                </h3>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wide uppercase"
                  style={{
                    backgroundColor: getCategoryColor(hoveredProject.category),
                    color: '#fff'
                  }}
                >
                  {getCategoryName(hoveredProject.category)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] text-gray-300">
                <span className="inline-flex items-center gap-1">
                  <span className="opacity-70">Status:</span>
                  <span className="px-1.5 py-0.5 rounded bg-black/30 border border-white/10 capitalize">
                    {hoveredProject.status}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="opacity-70">Zeitraum:</span>
                  <span className="px-1.5 py-0.5 rounded bg-black/30 border border-white/10">
                    {hoveredProject.startDate && hoveredProject.endDate
                      ? `${new Date(hoveredProject.startDate).toLocaleDateString()} – ${new Date(hoveredProject.endDate).toLocaleDateString()}`
                      : 'n/a'}
                  </span>
                </span>
                {typeof hoveredProject.fortschritt === 'number' && (
                  <span className="inline-flex items-center gap-1">
                    <span className="opacity-70">Fortschritt:</span>
                    <span className="px-1.5 py-0.5 rounded bg-black/30 border border-white/10">{hoveredProject.fortschritt}%</span>
                  </span>
                )}
              </div>
            </div>

            {typeof hoveredProject.fortschritt === 'number' && (
              <div className="w-full h-2 bg-gray-700/60 rounded mb-3 overflow-hidden">
                <div
                  className="h-full rounded bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                  style={{ width: `${Math.min(Math.max(hoveredProject.fortschritt,0),100)}%` }}
                />
              </div>
            )}

            {/* Description (truncated) */}
            {hoveredProject.description && (
              <p className="text-xs md:text-[13px] text-gray-200 leading-snug mb-3 line-clamp-4">{hoveredProject.description}</p>
            )}

            {/* Project Fields */}
            {hoveredProject.ProjectFields && hoveredProject.ProjectFields.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1 font-medium">Felder</div>
                <div className="flex flex-wrap gap-1.5">
                  {hoveredProject.ProjectFields.slice(0,8).map(f => (
                    <span key={f} className="text-[10px] bg-black/40 border border-white/10 px-2 py-0.5 rounded-full text-gray-200 truncate max-w-[120px]" title={f}>{f}</span>
                  ))}
                  {hoveredProject.ProjectFields.length > 8 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 border border-dashed border-white/20">+{hoveredProject.ProjectFields.length - 8}</span>
                  )}
                </div>
              </div>
            )}

            {/* Links */}
            {hoveredProject.links && hoveredProject.links.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1 font-medium">Links</div>
                <ul className="space-y-1">
                  {hoveredProject.links.slice(0,3).map(l => (
                    <li key={l.id} className="text-[11px] truncate">
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-300 hover:text-amber-200 underline decoration-dotted"
                      >{l.title || l.url}</a>
                    </li>
                  ))}
                  {hoveredProject.links.length > 3 && (
                    <li className="text-[10px] text-gray-400">+{hoveredProject.links.length - 3} weitere…</li>
                  )}
                </ul>
              </div>
            )}

            {/* Team Members */}
            {hoveredProject.teamMembers && hoveredProject.teamMembers.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1 font-medium">Team</div>
                <div className="flex flex-wrap gap-1.5">
                  {hoveredProject.teamMembers.slice(0,6).map(tm => (
                    <span key={tm.id || tm.name} className="text-[10px] px-2 py-0.5 rounded bg-gray-700/60 text-gray-200 border border-white/10 truncate max-w-[110px]" title={tm.name}>{tm.name}</span>
                  ))}
                  {hoveredProject.teamMembers.length > 6 && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gray-700/40 border border-dashed border-white/20">+{hoveredProject.teamMembers.length - 6}</span>
                  )}
                </div>
              </div>
            )}

            {/* Footer meta / budget etc. */}
            {(hoveredProject.budget || hoveredProject.geplante_umsetzung) && (
              <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-2 text-[10px] text-gray-400">
                {hoveredProject.budget && (
                  <span className="bg-black/30 px-2 py-0.5 rounded border border-white/10" title="Budget">Budget: {hoveredProject.budget}</span>
                )}
                {hoveredProject.geplante_umsetzung && (
                  <span className="bg-black/30 px-2 py-0.5 rounded border border-white/10" title="Geplante Umsetzung">Plan: {hoveredProject.geplante_umsetzung}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default Roadmap;