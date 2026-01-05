import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import type { ParsedUrlQuery } from 'querystring';
import RoadmapYearNavigation from './RoadmapYearNavigation';
import { Category, Project } from '../types';
import { clientDataService } from '../utils/clientDataService';
import { INSTANCE_COOKIE_NAME, INSTANCE_QUERY_PARAM } from '../utils/instanceConfig';
import { normalizeCategoryId, UNCATEGORIZED_ID } from '../utils/categoryUtils';
import CategorySidebar from './CategorySidebar';
import { FaBars, FaTimes } from 'react-icons/fa';
import { loadThemeSettings } from '../utils/theme';
import RoadmapFilters from './RoadmapFilters';
import CompactProjectCard from './CompactProjectCard';

const getYearFromISOString = (isoString: string, fallbackYear: number): number => {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? fallbackYear : date.getFullYear();
};

const getQuarterFromDate = (date: Date): number => {
  return Math.floor(date.getMonth() / 3) + 1;
};

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
  const [themeColors, setThemeColors] = useState<{ gradientFrom: string; gradientTo: string }>({
    gradientFrom: '#eab308',
    gradientTo: '#b45309',
  });
  const [filterText, setFilterText] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [monthRange, setMonthRange] = useState<{ start: number; end: number }>({
    start: 1,
    end: 12,
  });
  const [onlyRunning, setOnlyRunning] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'tiles'>('timeline');

  const sidebarRef = useRef<HTMLDivElement>(null);
  // Track whether URL-derived category selection has been applied to prevent race conditions
  const urlCatsAppliedRef = useRef(false);

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setMobileCategoriesOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

  // Load filters from URL on mount and whenever query changes
  useEffect(() => {
    const slugRaw = router.query[INSTANCE_QUERY_PARAM];
    const slug = Array.isArray(slugRaw) ? slugRaw[0] : slugRaw;
    if (slug) {
      // Ensure the active instance cookie matches the current slug when navigating between instances
      document.cookie = `${INSTANCE_COOKIE_NAME}=${encodeURIComponent(slug)}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
    }

    const { q, status, tags, start, end, running, cats, view } = router.query as Record<
      string,
      string | string[]
    >;
    if (q && typeof q === 'string') setFilterText(q);
    if (status) {
      const list = Array.isArray(status) ? status : status.split(',');
      setStatusFilters(list.filter(Boolean).map((s) => s.toLowerCase()));
    }
    if (tags) {
      const list = Array.isArray(tags) ? tags : tags.split(',');
      setTagFilters(list.filter(Boolean));
    }
    const sNum = Number(start);
    const eNum = Number(end);
    if (!isNaN(sNum) && sNum >= 1 && sNum <= 12)
      setMonthRange((r) => ({ ...r, start: Math.max(1, Math.min(12, sNum)) }));
    if (!isNaN(eNum) && eNum >= 1 && eNum <= 12)
      setMonthRange((r) => ({ ...r, end: Math.max(r.start, Math.min(12, eNum)) }));
    if (running === '1') setOnlyRunning(true);
    if (view === 'tiles') setViewMode('tiles');
    if (!urlCatsAppliedRef.current && cats && typeof cats === 'string') {
      const list = cats.split(',').filter(Boolean);
      if (list.length) {
        setActiveCategories(list);
        urlCatsAppliedRef.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query]);

  // Persist filters to URL (shallow) to allow shareable state
  useEffect(() => {
    const readQuery = (q: ParsedUrlQuery) => {
      const rawStatus = q['status'];
      const rawTags = q['tags'];
      const rawCats = q['cats'];
      const rawStart = q['start'];
      const rawEnd = q['end'];
      const rawRunning = q['running'];
      const rawQ = q['q'];
      const rawInstance = q['roadmapInstance'];
      const toScalar = (value: string | string[] | undefined): string =>
        Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
      const status = (rawStatus ? (Array.isArray(rawStatus) ? rawStatus.join(',') : rawStatus) : '')
        .split(',')
        .filter(Boolean)
        .map((s: string) => s.toLowerCase());
      const tags = (rawTags ? (Array.isArray(rawTags) ? rawTags.join(',') : rawTags) : '')
        .split(',')
        .filter(Boolean);
      const cats = (rawCats ? (Array.isArray(rawCats) ? rawCats.join(',') : rawCats) : '')
        .split(',')
        .filter(Boolean);
      return {
        q: toScalar(rawQ),
        status,
        tags,
        start: Number(toScalar(rawStart)) || 1,
        end: Number(toScalar(rawEnd)) || 12,
        running: toScalar(rawRunning) === '1',
        cats,
        instance: toScalar(rawInstance),
      };
    };

    const current = readQuery(router.query);
    // Determine whether current category selection is effectively default
    const hasAllNamed =
      categories.length > 0 && categories.every((c) => activeCategories.includes(c.id));
    const hasUncat = activeCategories.includes(UNCATEGORIZED_ID);
    const isDefaultCats =
      hasAllNamed && hasUncat && activeCategories.length === categories.length + 1;
    const isAllNamedOnly =
      hasAllNamed && !hasUncat && activeCategories.length === categories.length;

    const next = {
      q: filterText || '',
      status: [...statusFilters].map((s) => s.toLowerCase()),
      tags: [...tagFilters],
      start: monthRange.start,
      end: monthRange.end,
      running: onlyRunning,
      // Omit cats from URL when selection equals default (all named +/- uncategorized)
      // Also omit if only uncategorized is selected (likely means no real categories exist yet)
      cats:
        isDefaultCats ||
        isAllNamedOnly ||
        activeCategories.length === 0 ||
        (activeCategories.length === 1 && activeCategories[0] === UNCATEGORIZED_ID)
          ? []
          : [...activeCategories],
      view: viewMode,
      instance: current.instance,
    };

    if (JSON.stringify(current) !== JSON.stringify(next)) {
      const query: Record<string, string> = {};
      if (next.q) query.q = next.q;
      if (next.status.length) query.status = next.status.join(',');
      if (next.tags.length) query.tags = next.tags.join(',');
      if (next.start !== 1) query.start = String(next.start);
      if (next.end !== 12) query.end = String(next.end);
      if (next.running) query.running = '1';
      if (next.cats.length) query.cats = next.cats.join(',');
      if (next.view && next.view !== 'timeline') query.view = next.view;
      if (next.instance) query.roadmapInstance = next.instance;
      router.replace({ pathname: router.pathname, query }, undefined, {
        shallow: true,
        scroll: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filterText,
    statusFilters,
    tagFilters,
    monthRange.start,
    monthRange.end,
    onlyRunning,
    activeCategories,
    categories.length,
  ]);

  // Fetch categories and filter projects based on the selected year
  useEffect(() => {
    // Filter projects based on year
    const derive = (q: string, end = false): string => {
      const y = currentYear;
      switch ((q || '').toUpperCase()) {
        case 'Q1':
          return end
            ? new Date(Date.UTC(y, 2, 31, 23, 59, 59)).toISOString()
            : new Date(Date.UTC(y, 0, 1)).toISOString();
        case 'Q2':
          return end
            ? new Date(Date.UTC(y, 5, 30, 23, 59, 59)).toISOString()
            : new Date(Date.UTC(y, 3, 1)).toISOString();
        case 'Q3':
          return end
            ? new Date(Date.UTC(y, 8, 30, 23, 59, 59)).toISOString()
            : new Date(Date.UTC(y, 6, 1)).toISOString();
        case 'Q4':
          return end
            ? new Date(Date.UTC(y, 11, 31, 23, 59, 59)).toISOString()
            : new Date(Date.UTC(y, 9, 1)).toISOString();
        default:
          return end
            ? new Date(Date.UTC(y, 11, 31, 23, 59, 59)).toISOString()
            : new Date(Date.UTC(y, 0, 1)).toISOString();
      }
    };
    const filteredProjects = initialProjects.filter((project) => {
      const startIso =
        project.startDate || (project.startQuarter ? derive(project.startQuarter, false) : '');
      const endIso =
        project.endDate ||
        (project.endQuarter || project.startQuarter
          ? derive(project.endQuarter || project.startQuarter, true)
          : '');
      if (!startIso || !endIso) return false;

      const startYear = getYearFromISOString(startIso, currentYear);
      const endYear = getYearFromISOString(endIso, currentYear);
      return startYear <= currentYear && endYear >= currentYear;
    });

    setDisplayedProjects(filteredProjects);

    // Fetch categories
    const fetchCategories = async () => {
      try {
        const categoriesData = await clientDataService.getAllCategories();
        setCategories(categoriesData);
        // Only set active categories automatically if none have been applied yet
        setActiveCategories((prev) => {
          if (prev.length === 0 && !urlCatsAppliedRef.current) {
            return [...categoriesData.map((c) => c.id), UNCATEGORIZED_ID];
          }
          return prev;
        });
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, [currentYear, initialProjects]);

  // Debug logs removed (noise in production); enable via manual insertion if needed.

  const toggleCategory = (categoryId: string) => {
    if (activeCategories.includes(categoryId)) {
      setActiveCategories(activeCategories.filter((id) => id !== categoryId));
    } else {
      setActiveCategories([...activeCategories, categoryId]);
    }
  };

  // Derive filter options from displayed projects
  const allStatuses = Array.from(
    new Set(displayedProjects.map((p) => (p.status || '').toLowerCase()).filter(Boolean))
  );
  const allTags = Array.from(
    new Set(
      displayedProjects
        .flatMap((project) => project.ProjectFields ?? [])
        .filter((value): value is string => Boolean(value))
    )
  );

  // Filter projects by active categories + advanced filters
  const filteredProjects = displayedProjects.filter((project) => {
    const catId = normalizeCategoryId(project.category, categories);
    if (!activeCategories.includes(catId)) return false;

    // Text filter (title/description)
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      const inTitle = project.title?.toLowerCase().includes(q);
      const inDesc = (project.description || '').toLowerCase().includes(q);
      if (!inTitle && !inDesc) return false;
    }

    // Status filter (if any selected)
    if (statusFilters.length > 0) {
      const s = (project.status || '').toLowerCase();
      if (!statusFilters.includes(s)) return false;
    }

    // Tag filter (ProjectFields contains any of selected)
    if (tagFilters.length > 0) {
      const pf: string[] = (project.ProjectFields ?? []).map((t) => (t || '').toLowerCase());
      const hasAny = tagFilters.some((t) => pf.includes(t.toLowerCase()));
      if (!hasAny) return false;
    }

    // Zeitraum Month filter (if not default 1-12): intersect project with selected months of currentYear
    if (monthRange.start !== 1 || monthRange.end !== 12) {
      if (!project.startDate || !project.endDate) return false;
      const s = new Date(project.startDate);
      const e = new Date(project.endDate);
      // Map to month indices within current year (1..12)
      const projectStartMonth = Math.max(1, s.getFullYear() < currentYear ? 1 : s.getMonth() + 1);
      const projectEndMonth = Math.min(12, e.getFullYear() > currentYear ? 12 : e.getMonth() + 1);
      const overlaps = projectEndMonth >= monthRange.start && projectStartMonth <= monthRange.end;
      if (!overlaps) return false;
    }

    // Only running projects: start <= today <= end
    if (onlyRunning) {
      const now = new Date();
      const sd = project.startDate ? new Date(project.startDate) : null;
      const ed = project.endDate ? new Date(project.endDate) : null;
      if (!sd || !ed) return false;
      if (!(sd <= now && now <= ed)) return false;
    }

    return true;
  });

  // Group projects by category (Bereich)
  const projectsByCategory = filteredProjects.reduce<Record<string, Project[]>>((acc, p) => {
    const catId = normalizeCategoryId(p.category, categories);
    (acc[catId] ||= []).push(p);
    return acc;
  }, {});

  // Ordered list of visible categories (only those with projects)
  const visibleCategoryIds = [
    ...categories.filter((c) => projectsByCategory[c.id]?.length).map((c) => c.id),
    ...(projectsByCategory[UNCATEGORIZED_ID]?.length ? [UNCATEGORIZED_ID] : []),
  ];

  // Get category name by ID
  const getCategoryName = (categoryId: string) => {
    if (categoryId === UNCATEGORIZED_ID) return 'Uncategorized';
    const category = categories.find((cat) => cat.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  // Get category color by ID
  const getCategoryColor = (categoryId: string) => {
    if (categoryId === UNCATEGORIZED_ID) return '#777777';
    const category = categories.find((cat) => cat.id === categoryId);
    return category?.color || '#777777';
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
  const calculateQuarterPosition = (project: Project): { startPosition: number; width: number } => {
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
  const calculateMonthPosition = (project: Project): { startPosition: number; width: number } => {
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

  // ISO-8601 helpers for weeks
  const getISOWeek = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; // 1..7 (Mon..Sun)
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };
  const getISOWeeksInYear = (year: number): number => {
    const d = new Date(Date.UTC(year, 11, 31));
    const week = getISOWeek(d);
    return week === 1 ? 52 : week; // if Dec 31 falls in week 1 of next year, then 52 weeks; else 52/53
  };

  // Calculate position for week view (ISO weeks, dynamic 52/53)
  const calculateWeekPosition = (project: Project): { startPosition: number; width: number } => {
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
    const weeksInCurrent = getISOWeeksInYear(currentYear);
    const startWeek = getISOWeek(startDate);
    const endWeek = getISOWeek(endDate);

    let startPosition = 0;
    let width = 0;

    if (startYear < currentYear) {
      // Project started before current year
      startPosition = 0;
    } else if (startYear === currentYear) {
      // Project starts in current year
      startPosition =
        ((Math.max(1, Math.min(startWeek, weeksInCurrent)) - 1) / weeksInCurrent) * 100;
    }

    if (endYear > currentYear) {
      // Project ends after current year
      width = 100 - startPosition;
    } else if (endYear === currentYear) {
      // Project ends in current year
      width =
        (Math.max(1, Math.min(endWeek, weeksInCurrent)) / weeksInCurrent) * 100 - startPosition;
    }

    return { startPosition, width };
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <div className="mx-auto w-full space-y-8 px-3 sm:px-6 lg:w-[85%]">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 px-6 py-8 shadow-xl shadow-slate-950/30">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300/90">
                Roadmap {currentYear}
              </p>
              <h1
                className="text-3xl font-semibold text-white sm:text-4xl"
                style={{
                  backgroundImage: `linear-gradient(to right, ${themeColors.gradientFrom}, ${themeColors.gradientTo})`,
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                {siteTitle}
              </h1>
              <p className="text-sm text-slate-300 sm:text-base">
                Filtere Projekte nach Status, Kategorien und Zeiträumen, um Fortschritt und
                Prioritäten auf einen Blick sichtbar zu machen.
              </p>
            </div>
            <div className="grid w-full gap-3 text-xs text-slate-300 sm:w-auto sm:text-sm md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-center">
                <span className="block text-2xl font-semibold text-white">
                  {displayedProjects.length}
                </span>
                <span>Projekte sichtbar</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 px-4 py-5 shadow-lg shadow-slate-950/30 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* View mode + View scale buttons */}
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:gap-3">
              <div className="inline-flex overflow-hidden rounded-xl border border-slate-700 bg-slate-900/70">
                <button
                  className={`px-3 py-2 text-sm font-medium transition ${viewMode === 'timeline' ? 'bg-sky-500 text-white shadow-sm shadow-sky-900/40' : 'text-slate-200 hover:bg-slate-800'}`}
                  onClick={() => setViewMode('timeline')}
                  title="Zeitstrahl"
                >
                  Zeitstrahl
                </button>
                <button
                  className={`px-3 py-2 text-sm font-medium transition ${viewMode === 'tiles' ? 'bg-sky-500 text-white shadow-sm shadow-sky-900/40' : 'text-slate-200 hover:bg-slate-800'}`}
                  onClick={() => setViewMode('tiles')}
                  title="Kachelansicht"
                >
                  Kacheln
                </button>
              </div>
              <button
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition md:flex-none ${viewType === 'quarters' ? 'bg-sky-500 text-white shadow-sm shadow-sky-900/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                onClick={() => setViewType('quarters')}
              >
                Quartale
              </button>
              <button
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition md:flex-none ${viewType === 'months' ? 'bg-sky-500 text-white shadow-sm shadow-sky-900/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                onClick={() => setViewType('months')}
              >
                Monate
              </button>
              <button
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition md:flex-none ${viewType === 'weeks' ? 'bg-sky-500 text-white shadow-sm shadow-sky-900/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                onClick={() => setViewType('weeks')}
              >
                Wochen
              </button>
            </div>

            {/* Year navigation - Responsive */}
            <div className="flex w-full flex-wrap items-center justify-center gap-4 md:justify-end">
              <RoadmapYearNavigation initialYear={currentYear} onYearChange={setCurrentYear} />
            </div>
          </div>
        </div>

        {/* Mobile categories toggle button */}
        <div className="md:hidden mb-4 px-4">
          <button
            onClick={() => setMobileCategoriesOpen(!mobileCategoriesOpen)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2 text-slate-200 transition hover:border-sky-500 hover:text-white"
          >
            <span>Kategorien auswählen</span>
            {mobileCategoriesOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {/* Responsive layout - stack on mobile, side-by-side on larger screens */}
        <div className="flex flex-col md:flex-row relative">
          {/* Sidebar with categories - collapsible on mobile */}
          <div
            ref={sidebarRef}
            className={`md:w-64 mb-4 md:mb-0 ${mobileCategoriesOpen ? 'block' : 'hidden'} md:block z-20 bg-slate-950/95 md:bg-transparent md:static absolute top-0 left-0 right-0 p-4 md:p-0`}
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
              <div
                className={`min-w-full ${viewType === 'months' || viewType === 'weeks' ? 'md:min-w-[800px]' : ''}`}
              >
                {/* Advanced Filters Bar */}
                <div className="mb-4">
                  <RoadmapFilters
                    filterText={filterText}
                    onFilterTextChange={setFilterText}
                    availableStatuses={allStatuses}
                    selectedStatuses={statusFilters}
                    onToggleStatus={(s) =>
                      setStatusFilters((prev) =>
                        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                      )
                    }
                    availableTags={allTags}
                    selectedTags={tagFilters}
                    onToggleTag={(t) =>
                      setTagFilters((prev) =>
                        prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                      )
                    }
                    onClearAll={() => {
                      setFilterText('');
                      setStatusFilters([]);
                      setTagFilters([]);
                      setMonthRange({ start: 1, end: 12 });
                      setOnlyRunning(false);
                    }}
                    monthRange={monthRange}
                    onMonthRangeChange={setMonthRange}
                    onlyRunning={onlyRunning}
                    onToggleOnlyRunning={setOnlyRunning}
                    onSelectAllCategories={() => setActiveCategories(categories.map((c) => c.id))}
                    onClearCategories={() => setActiveCategories([])}
                  />
                </div>
                {/* Quarter/Month/Week headers */}

                {viewMode === 'timeline' && (
                  <>
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
                        <div
                          className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #eab308, #e3a008)' }}
                        >
                          Jan
                        </div>
                        <div
                          className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #e3a008, #dd9107)' }}
                        >
                          Feb
                        </div>
                        <div
                          className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #dd9107, #d97706)' }}
                        >
                          Mär
                        </div>
                        <div
                          className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #d97706, #d57005)' }}
                        >
                          Apr
                        </div>
                        <div
                          className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #d57005, #d16904)' }}
                        >
                          Mai
                        </div>
                        <div
                          className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #d16904, #cc6203)' }}
                        >
                          Jun
                        </div>
                        <div
                          className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #cc6203, #c65b02)' }}
                        >
                          Jul
                        </div>
                        <div
                          className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #c65b02, #c05401)' }}
                        >
                          Aug
                        </div>
                        <div
                          className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #c05401, #ba4d01)' }}
                        >
                          Sep
                        </div>
                        <div
                          className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #ba4d01, #b44600)' }}
                        >
                          Okt
                        </div>
                        <div
                          className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #b44600, #ae3f00)' }}
                        >
                          Nov
                        </div>
                        <div
                          className="p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #ae3f00, #a83800)' }}
                        >
                          Dez
                        </div>
                      </div>
                    ) : (
                      <div
                        className="mb-4 md:mb-6 overflow-x-auto"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${getISOWeeksInYear(currentYear)}, minmax(30px, 1fr))`,
                          gap: 0,
                        }}
                      >
                        {Array.from(
                          { length: getISOWeeksInYear(currentYear) },
                          (_, i) => i + 1
                        ).map((week) => (
                          <div
                            key={week}
                            className="p-1 text-center font-semibold text-xs"
                            style={{
                              background: `linear-gradient(to right, 
                            hsl(${Math.max(40 - week * 0.5, 0)}, 90%, ${Math.max(50 - week * 0.3, 30)}%)
                          )`,
                            }}
                          >
                            {week}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {viewMode === 'tiles' && <div className="mb-6" />}

                {viewMode === 'timeline' && (
                  <>
                    {/* Project timeline bars grouped by Bereich (category) */}
                    <div className="space-y-6 md:space-y-8 relative">
                      {visibleCategoryIds.map((catId) => {
                        const groupProjects = projectsByCategory[catId] || [];
                        return (
                          <div key={catId} className="relative">
                            {/* Bereich Kopfzeile */}
                            <div className="flex items-center gap-3 mb-2 md:mb-3">
                              <span
                                className="inline-block h-3 w-3 rounded-full"
                                style={{ backgroundColor: getCategoryColor(catId) }}
                              />
                              <h2 className="text-lg md:text-xl font-semibold m-0">
                                {getCategoryName(catId)}
                              </h2>
                              <span className="ml-2 text-xs md:text-sm px-2 py-0.5 rounded-full bg-slate-800/80 border border-white/10 text-slate-200">
                                {groupProjects.length}{' '}
                                {groupProjects.length === 1 ? 'Projekt' : 'Projekte'}
                              </span>
                            </div>

                            {/* Projekte dieser Kategorie */}
                            <div className="space-y-2 md:space-y-4">
                              {groupProjects.map((project) => {
                                // Use the appropriate position calculation based on view type
                                const { startPosition, width } =
                                  viewType === 'quarters'
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
                                    className="relative h-6 md:h-8 mb-1 md:mb-2"
                                  >
                                    {/* Background grid */}
                                    <div className="absolute top-0 left-0 right-0 h-full pointer-events-none">
                                      {viewType === 'quarters' ? (
                                        <div className="grid grid-cols-4 gap-2 md:gap-4 h-full">
                                          <div className="bg-slate-800 rounded-lg opacity-30"></div>
                                          <div className="bg-slate-800 rounded-lg opacity-30"></div>
                                          <div className="bg-slate-800 rounded-lg opacity-30"></div>
                                          <div className="bg-slate-800 rounded-lg opacity-30"></div>
                                        </div>
                                      ) : viewType === 'months' ? (
                                        <div className="grid grid-cols-12 gap-1 md:gap-2 h-full">
                                          {Array.from({ length: 12 }, (_, i) => (
                                            <div
                                              key={i}
                                              className="bg-slate-800 rounded-lg opacity-30"
                                            ></div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div
                                          className="h-full"
                                          style={{
                                            display: 'grid',
                                            gridTemplateColumns: `repeat(${getISOWeeksInYear(currentYear)}, minmax(0, 1fr))`,
                                            gap: 0,
                                          }}
                                        >
                                          {Array.from(
                                            { length: getISOWeeksInYear(currentYear) },
                                            (_, i) => (
                                              <div
                                                key={i}
                                                className="bg-slate-800 rounded-lg opacity-30"
                                              ></div>
                                            )
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Project bar */}
                                    <div
                                      className="absolute top-0 h-full rounded-lg flex items-center px-1 md:px-3 cursor-pointer transition-all hover:brightness-110 group border border-white border-opacity-30 hover:border-opacity-70"
                                      style={{
                                        left: `${startPosition}%`,
                                        width: `${width}%`,
                                        backgroundColor: getCategoryColor(catId),
                                        opacity: 0.85,
                                      }}
                                      onMouseEnter={(e) => handleMouseOver(e, project)}
                                      onMouseLeave={handleMouseLeave}
                                      onClick={() => handleProjectClick(project.id)}
                                      onTouchStart={(e) => {
                                        // Show tooltip on touch start
                                        const touch = e.touches[0];
                                        handleMouseOver(
                                          {
                                            clientX: touch.clientX,
                                            clientY: touch.clientY,
                                          } as React.MouseEvent,
                                          project
                                        );
                                      }}
                                      onTouchEnd={() => {
                                        // Hide tooltip after a short delay to allow for tap recognition
                                        setTimeout(() => handleMouseLeave(), 500);
                                      }}
                                    >
                                      {/* Project title with improved visibility */}
                                      <div className="flex items-center gap-1 w-full overflow-hidden">
                                        <span className="font-medium truncate px-1 md:px-2 py-0.5 rounded bg-black bg-opacity-40 text-white group-hover:bg-opacity-60 text-[10px] md:text-sm flex-shrink">
                                          {project.title}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {viewMode === 'tiles' && (
                  <div className="space-y-8">
                    {visibleCategoryIds.map((catId) => {
                      const groupProjects = projectsByCategory[catId] || [];
                      return (
                        <div key={catId}>
                          <div className="flex items-center gap-3 mb-3">
                            <span
                              className="inline-block h-3 w-3 rounded-full"
                              style={{ backgroundColor: getCategoryColor(catId) }}
                            />
                            <h2 className="text-lg md:text-xl font-semibold m-0">
                              {getCategoryName(catId)}
                            </h2>
                            <span className="ml-2 rounded-full border border-slate-700/70 bg-slate-900/80 px-2 py-0.5 text-xs text-slate-200 md:text-sm">
                              {groupProjects.length}{' '}
                              {groupProjects.length === 1 ? 'Projekt' : 'Projekte'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                            {groupProjects.map((project) => (
                              <CompactProjectCard
                                key={project.id}
                                project={project}
                                categoryName={getCategoryName(catId)}
                                categoryColor={getCategoryColor(catId)}
                                onClick={handleProjectClick}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Hover Popup (Rich Tooltip) */}
        {hoveredProject && (
          <div
            className="fixed z-50 w-[300px] pointer-events-none rounded-xl border border-slate-800/70 bg-gradient-to-b from-slate-950/95 to-slate-900/95 p-3 text-white shadow-2xl shadow-slate-950/50 backdrop-blur-sm md:w-[360px] md:p-4 animate-fadeIn"
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
                    color: '#fff',
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
                {hoveredProject.projektphase && (
                  <span className="inline-flex items-center gap-1">
                    <span className="opacity-70">Phase:</span>
                    <span className="px-1.5 py-0.5 rounded bg-black/30 border border-white/10">
                      {(() => {
                        const p = (hoveredProject.projektphase || '').toLowerCase();
                        if (p === 'einfuehrung' || p === 'einführung') return 'Einführung';
                        return p.charAt(0).toUpperCase() + p.slice(1);
                      })()}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Description (truncated) */}
            {hoveredProject.description && (
              <p className="text-xs md:text-[13px] text-gray-200 leading-snug mb-3 line-clamp-4">
                {hoveredProject.description}
              </p>
            )}

            {/* Project Fields */}
            {hoveredProject.ProjectFields && hoveredProject.ProjectFields.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1 font-medium">
                  Felder
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {hoveredProject.ProjectFields.slice(0, 8).map((f) => (
                    <span
                      key={f}
                      className="text-[10px] bg-black/40 border border-white/10 px-2 py-0.5 rounded-full text-gray-200 truncate max-w-[120px]"
                      title={f}
                    >
                      {f}
                    </span>
                  ))}
                  {hoveredProject.ProjectFields.length > 8 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 border border-dashed border-white/20">
                      +{hoveredProject.ProjectFields.length - 8}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Links */}
            {hoveredProject.links && hoveredProject.links.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1 font-medium">
                  Links
                </div>
                <ul className="space-y-1">
                  {hoveredProject.links.slice(0, 3).map((l) => (
                    <li key={l.id} className="text-[11px] truncate">
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-300 hover:text-amber-200 underline decoration-dotted"
                      >
                        {l.title || l.url}
                      </a>
                    </li>
                  ))}
                  {hoveredProject.links.length > 3 && (
                    <li className="text-[10px] text-gray-400">
                      +{hoveredProject.links.length - 3} weitere…
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Team Members */}
            {hoveredProject.teamMembers && hoveredProject.teamMembers.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1 font-medium">
                  Team
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {hoveredProject.teamMembers.slice(0, 6).map((tm) => (
                    <span
                      key={tm.id || tm.name}
                      className="text-[10px] px-2 py-0.5 truncate rounded bg-slate-700/60 text-slate-200 border border-white/10 max-w-[110px]"
                      title={tm.name}
                    >
                      {tm.name}
                    </span>
                  ))}
                  {hoveredProject.teamMembers.length > 6 && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700/40 border border-dashed border-white/20">
                      +{hoveredProject.teamMembers.length - 6}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Footer meta / budget etc. */}
            {(hoveredProject.budget ||
              hoveredProject.geplante_umsetzung ||
              hoveredProject.naechster_meilenstein) && (
              <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-2 text-[10px] text-gray-400">
                {hoveredProject.budget && (
                  <span
                    className="bg-black/30 px-2 py-0.5 rounded border border-white/10"
                    title="Budget"
                  >
                    Budget: {hoveredProject.budget} CHF
                  </span>
                )}
                {hoveredProject.geplante_umsetzung && (
                  <span
                    className="bg-black/30 px-2 py-0.5 rounded border border-white/10"
                    title="Geplante Umsetzung"
                  >
                    Plan: {hoveredProject.geplante_umsetzung}
                  </span>
                )}
                {hoveredProject.naechster_meilenstein && (
                  <span
                    className="bg-black/30 px-2 py-0.5 rounded border border-white/10"
                    title="Nächster Meilenstein"
                  >
                    Meilenstein: {hoveredProject.naechster_meilenstein}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Roadmap;
