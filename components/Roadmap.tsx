import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import type { ParsedUrlQuery } from 'querystring';
import RoadmapYearNavigation from './RoadmapYearNavigation';
import { Category, Project, ProjectOrderByCategory } from '../types';
import { INSTANCE_COOKIE_NAME, INSTANCE_QUERY_PARAM } from '../utils/instanceConfig';
import { normalizeCategoryId, UNCATEGORIZED_ID } from '../utils/categoryUtils';
import CategorySidebar from './CategorySidebar';
import { FaBars, FaGripVertical as FiGripVertical, FaTimes } from 'react-icons/fa';
import { loadThemeSettings } from '../utils/theme';
import RoadmapFilters from './RoadmapFilters';
import CompactProjectCard from './CompactProjectCard';
import {
  buildInstanceAwareUrl,
  hasAdminAccessToCurrentInstance,
  hasValidAdminSession,
} from '@/utils/auth';
import { getRichTextPlainText } from '@/utils/richText';

type ProgressBucket = 'all' | 'not-started' | 'active' | 'almost-done' | 'completed';

const PHASE_ORDER = [
  'initialisierung',
  'konzept',
  'realisierung',
  'einfuehrung',
  'abschluss',
] as const;

const STATUS_ORDER = ['planned', 'in-progress', 'paused', 'completed', 'cancelled'] as const;

const getYearFromISOString = (isoString: string, fallbackYear: number): number => {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? fallbackYear : date.getFullYear();
};

const getQuarterFromDate = (date: Date): number => {
  return Math.floor(date.getMonth() / 3) + 1;
};

const normalizePhaseValue = (value?: string | null): string => {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'einführung') return 'einfuehrung';
  return normalized;
};

const getProgressBucket = (progress?: number): Exclude<ProgressBucket, 'all'> => {
  const numericProgress = Number.isFinite(progress) ? Number(progress) : 0;
  if (numericProgress >= 100) return 'completed';
  if (numericProgress >= 75) return 'almost-done';
  if (numericProgress > 0) return 'active';
  return 'not-started';
};

const moveCategoryInList = (
  categories: Category[],
  sourceCategoryId: string,
  targetCategoryId: string
): Category[] => {
  const sourceIndex = categories.findIndex((category) => category.id === sourceCategoryId);
  const targetIndex = categories.findIndex((category) => category.id === targetCategoryId);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return categories;
  }

  const nextCategories = [...categories];
  const [movedCategory] = nextCategories.splice(sourceIndex, 1);
  nextCategories.splice(targetIndex, 0, movedCategory);
  return nextCategories;
};

const moveProjectInList = (
  projects: Project[],
  sourceProjectId: string,
  targetProjectId: string
): Project[] => {
  const sourceIndex = projects.findIndex((project) => project.id === sourceProjectId);
  const targetIndex = projects.findIndex((project) => project.id === targetProjectId);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return projects;
  }

  const nextProjects = [...projects];
  const [movedProject] = nextProjects.splice(sourceIndex, 1);
  nextProjects.splice(targetIndex, 0, movedProject);
  return nextProjects;
};

const applyStoredProjectOrder = (
  projects: Project[],
  orderedProjectIds: string[] | undefined
): Project[] => {
  if (!orderedProjectIds?.length || projects.length <= 1) {
    return projects;
  }

  const orderIndex = new Map<string, number>();
  orderedProjectIds.forEach((projectId, index) => {
    if (!orderIndex.has(projectId)) {
      orderIndex.set(projectId, index);
    }
  });

  const originalIndex = new Map<string, number>();
  projects.forEach((project, index) => {
    originalIndex.set(project.id, index);
  });

  return [...projects].sort((left, right) => {
    const leftOrder = orderIndex.get(left.id);
    const rightOrder = orderIndex.get(right.id);

    if (leftOrder !== undefined && rightOrder !== undefined) {
      return leftOrder - rightOrder;
    }

    if (leftOrder !== undefined) return -1;
    if (rightOrder !== undefined) return 1;

    return (originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0);
  });
};

interface RoadmapProps {
  initialProjects: Project[];
  initialCategories: Category[];
  initialProjectOrderByCategory: ProjectOrderByCategory;
}

const Roadmap: React.FC<RoadmapProps> = ({
  initialProjects,
  initialCategories,
  initialProjectOrderByCategory,
}) => {
  const router = useRouter();

  const instanceSlug = useMemo(() => {
    const raw = router.query?.[INSTANCE_QUERY_PARAM];
    return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
  }, [router.query]);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [displayedProjects, setDisplayedProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [hoveredProject, setHoveredProject] = useState<Project | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [viewType, setViewType] = useState<'quarters' | 'months' | 'weeks' | 'years'>('quarters');
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [siteTitle, setSiteTitle] = useState('IT + Digital Roadmap');
  const [themeColors, setThemeColors] = useState<{ gradientFrom: string; gradientTo: string }>({
    gradientFrom: '#eab308',
    gradientTo: '#b45309',
  });
  const [filterText, setFilterText] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [badgeFilters, setBadgeFilters] = useState<string[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [projectTypeFilters, setProjectTypeFilters] = useState<string[]>([]);
  const [phaseFilters, setPhaseFilters] = useState<string[]>([]);
  const [leadFilters, setLeadFilters] = useState<string[]>([]);
  const [attributeFilters, setAttributeFilters] = useState<string[]>([]);
  const [progressBucket, setProgressBucket] = useState<ProgressBucket>('all');
  const [monthRange, setMonthRange] = useState<{ start: number; end: number }>({
    start: 1,
    end: 12,
  });
  const [onlyRunning, setOnlyRunning] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'tiles'>('timeline');
  const [isAdmin, setIsAdmin] = useState(false);
  const [projectOrderByCategory, setProjectOrderByCategory] = useState<ProjectOrderByCategory>(
    initialProjectOrderByCategory
  );
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
  const [isSavingCategoryOrder, setIsSavingCategoryOrder] = useState(false);
  const [categoryOrderError, setCategoryOrderError] = useState<string | null>(null);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [draggedProjectCategoryId, setDraggedProjectCategoryId] = useState<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const [isSavingProjectOrder, setIsSavingProjectOrder] = useState(false);
  const [projectOrderError, setProjectOrderError] = useState<string | null>(null);

  const sidebarRef = useRef<HTMLDivElement>(null);
  // Track whether URL-derived category selection has been applied to prevent race conditions
  const urlCatsAppliedRef = useRef(false);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    setProjectOrderByCategory(initialProjectOrderByCategory);
  }, [initialProjectOrderByCategory]);

  // When the active instance changes, reset category selection derived from the previous instance.
  useEffect(() => {
    urlCatsAppliedRef.current = false;
    setActiveCategories([]);
  }, [instanceSlug]);

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

  useEffect(() => {
    let cancelled = false;

    const checkAdmin = async () => {
      try {
        const [hasSession, hasInstanceAdminAccess] = await Promise.all([
          hasValidAdminSession(),
          hasAdminAccessToCurrentInstance(),
        ]);
        if (!cancelled) {
          setIsAdmin(Boolean(hasSession && hasInstanceAdminAccess));
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
        }
      }
    };

    void checkAdmin();
    return () => {
      cancelled = true;
    };
  }, [instanceSlug]);

  // Load filters from URL on mount and whenever query changes
  useEffect(() => {
    const slugRaw = router.query[INSTANCE_QUERY_PARAM];
    const slug = Array.isArray(slugRaw) ? slugRaw[0] : slugRaw;
    if (slug) {
      // Ensure the active instance cookie matches the current slug when navigating between instances
      document.cookie = `${INSTANCE_COOKIE_NAME}=${encodeURIComponent(slug)}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
    }

    const {
      q,
      status,
      badges,
      tags,
      ptype,
      phase,
      lead,
      attrs,
      progress,
      start,
      end,
      running,
      cats,
      view,
    } = router.query as Record<string, string | string[]>;
    if (q && typeof q === 'string') setFilterText(q);
    if (status) {
      const list = Array.isArray(status) ? status : status.split(',');
      setStatusFilters(list.filter(Boolean).map((s) => s.toLowerCase()));
    }
    if (badges) {
      const list = Array.isArray(badges) ? badges : badges.split(',');
      setBadgeFilters(list.filter(Boolean));
    }
    if (tags) {
      const list = Array.isArray(tags) ? tags : tags.split(',');
      setTagFilters(list.filter(Boolean));
    }
    if (ptype) {
      const list = Array.isArray(ptype) ? ptype : ptype.split(',');
      setProjectTypeFilters(list.filter(Boolean).map((entry) => entry.toLowerCase()));
    }
    if (phase) {
      const list = Array.isArray(phase) ? phase : phase.split(',');
      setPhaseFilters(list.filter(Boolean).map((entry) => normalizePhaseValue(entry)));
    }
    if (lead) {
      const list = Array.isArray(lead) ? lead : lead.split(',');
      setLeadFilters(list.filter(Boolean));
    }
    if (attrs) {
      const list = Array.isArray(attrs) ? attrs : attrs.split(',');
      setAttributeFilters(list.filter(Boolean).map((entry) => entry.toLowerCase()));
    }
    if (
      typeof progress === 'string' &&
      ['all', 'not-started', 'active', 'almost-done', 'completed'].includes(progress)
    ) {
      setProgressBucket(progress as ProgressBucket);
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
      const rawBadges = q['badges'];
      const rawTags = q['tags'];
      const rawTypes = q['ptype'];
      const rawPhases = q['phase'];
      const rawLeads = q['lead'];
      const rawAttrs = q['attrs'];
      const rawProgress = q['progress'];
      const rawCats = q['cats'];
      const rawStart = q['start'];
      const rawEnd = q['end'];
      const rawRunning = q['running'];
      const rawQ = q['q'];
      const rawInstance = q['roadmapInstance'];
      const rawView = q['view'];
      const toScalar = (value: string | string[] | undefined): string =>
        Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
      const status = (rawStatus ? (Array.isArray(rawStatus) ? rawStatus.join(',') : rawStatus) : '')
        .split(',')
        .filter(Boolean)
        .map((s: string) => s.toLowerCase());
      const badges = (rawBadges ? (Array.isArray(rawBadges) ? rawBadges.join(',') : rawBadges) : '')
        .split(',')
        .filter(Boolean);
      const tags = (rawTags ? (Array.isArray(rawTags) ? rawTags.join(',') : rawTags) : '')
        .split(',')
        .filter(Boolean);
      const ptype = (rawTypes ? (Array.isArray(rawTypes) ? rawTypes.join(',') : rawTypes) : '')
        .split(',')
        .filter(Boolean)
        .map((entry: string) => entry.toLowerCase());
      const phase = (rawPhases ? (Array.isArray(rawPhases) ? rawPhases.join(',') : rawPhases) : '')
        .split(',')
        .filter(Boolean)
        .map((entry: string) => normalizePhaseValue(entry));
      const lead = (rawLeads ? (Array.isArray(rawLeads) ? rawLeads.join(',') : rawLeads) : '')
        .split(',')
        .filter(Boolean);
      const attrs = (rawAttrs ? (Array.isArray(rawAttrs) ? rawAttrs.join(',') : rawAttrs) : '')
        .split(',')
        .filter(Boolean)
        .map((entry: string) => entry.toLowerCase());
      const cats = (rawCats ? (Array.isArray(rawCats) ? rawCats.join(',') : rawCats) : '')
        .split(',')
        .filter(Boolean);
      return {
        q: toScalar(rawQ),
        status,
        badges,
        tags,
        ptype,
        phase,
        lead,
        attrs,
        progress: toScalar(rawProgress) || 'all',
        start: Number(toScalar(rawStart)) || 1,
        end: Number(toScalar(rawEnd)) || 12,
        running: toScalar(rawRunning) === '1',
        cats,
        view: toScalar(rawView) || 'timeline',
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
      badges: [...badgeFilters],
      tags: [...tagFilters],
      ptype: [...projectTypeFilters].map((entry) => entry.toLowerCase()),
      phase: [...phaseFilters].map((entry) => normalizePhaseValue(entry)),
      lead: [...leadFilters],
      attrs: [...attributeFilters].map((entry) => entry.toLowerCase()),
      progress: progressBucket,
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
      if (next.badges.length) query.badges = next.badges.join(',');
      if (next.tags.length) query.tags = next.tags.join(',');
      if (next.ptype.length) query.ptype = next.ptype.join(',');
      if (next.phase.length) query.phase = next.phase.join(',');
      if (next.lead.length) query.lead = next.lead.join(',');
      if (next.attrs.length) query.attrs = next.attrs.join(',');
      if (next.progress !== 'all') query.progress = next.progress;
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
    badgeFilters,
    tagFilters,
    projectTypeFilters,
    phaseFilters,
    leadFilters,
    attributeFilters,
    progressBucket,
    monthRange.start,
    monthRange.end,
    onlyRunning,
    activeCategories,
    categories.length,
    viewMode,
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
  }, [currentYear, initialProjects]);

  useEffect(() => {
    if (categories.length === 0) return;

    const validCategoryIds = new Set([
      ...categories.map((category) => category.id),
      UNCATEGORIZED_ID,
    ]);
    setActiveCategories((prev) => {
      if (prev.length === 0) {
        if (!urlCatsAppliedRef.current) {
          return [...categories.map((category) => category.id), UNCATEGORIZED_ID];
        }
        return prev;
      }

      const filtered = prev.filter((categoryId) => validCategoryIds.has(categoryId));
      if (filtered.length === 0) {
        return [...categories.map((category) => category.id), UNCATEGORIZED_ID];
      }

      if (
        filtered.length === prev.length &&
        filtered.every((categoryId, index) => categoryId === prev[index])
      ) {
        return prev;
      }

      return filtered;
    });
  }, [categories]);

  // Debug logs removed (noise in production); enable via manual insertion if needed.

  const toggleCategory = (categoryId: string) => {
    if (activeCategories.includes(categoryId)) {
      setActiveCategories(activeCategories.filter((id) => id !== categoryId));
    } else {
      setActiveCategories([...activeCategories, categoryId]);
    }
  };

  const canReorderCategories = () =>
    isAdmin && categories.filter((category) => visibleCategoryIds.includes(category.id)).length > 1;

  const canReorderProjectsInCategory = (categoryId: string) =>
    isAdmin && (orderedProjectsByCategory[categoryId]?.length ?? 0) > 1;

  const canReorderAnyProjects = () =>
    visibleCategoryIds.some((categoryId) => canReorderProjectsInCategory(categoryId));

  const hasReorderControls = () => canReorderCategories() || canReorderAnyProjects();

  const isReorderableCategory = (categoryId: string) =>
    canReorderCategories() && categoryId !== UNCATEGORIZED_ID;

  const getCategorySectionClassName = (categoryId: string) => {
    const isDragged = draggedCategoryId === categoryId;
    const isDropTarget = dragOverCategoryId === categoryId && draggedCategoryId !== categoryId;

    return [
      'relative rounded-3xl border p-3 md:p-4 transition-all',
      isDropTarget
        ? 'border-sky-400/60 bg-sky-500/10 shadow-lg shadow-sky-950/20'
        : 'border-white/5 bg-transparent',
      isDragged ? 'opacity-60' : '',
    ]
      .filter(Boolean)
      .join(' ');
  };

  const persistCategoryOrder = async (
    nextCategories: Category[],
    previousCategories: Category[]
  ) => {
    setCategoryOrderError(null);
    setIsSavingCategoryOrder(true);

    try {
      const response = await fetch(buildInstanceAwareUrl('/api/categories/reorder'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderedCategoryIds: nextCategories.map((category) => category.id),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error || 'Die Kategorien-Reihenfolge konnte nicht gespeichert werden.'
        );
      }
    } catch (error) {
      console.error('Error saving category order:', error);
      setCategories(previousCategories);
      setCategoryOrderError('Die neue Kategorien-Reihenfolge konnte nicht gespeichert werden.');
    } finally {
      setIsSavingCategoryOrder(false);
    }
  };

  const persistProjectOrder = async (
    categoryId: string,
    orderedProjectIds: string[],
    previousOrderMap: ProjectOrderByCategory
  ) => {
    setProjectOrderError(null);
    setIsSavingProjectOrder(true);

    try {
      const response = await fetch(buildInstanceAwareUrl('/api/projects/reorder'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryId,
          orderedProjectIds,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error || 'Die Projekt-Reihenfolge konnte nicht gespeichert werden.'
        );
      }
    } catch (error) {
      console.error('Error saving project order:', error);
      setProjectOrderByCategory(previousOrderMap);
      setProjectOrderError('Die neue Projekt-Reihenfolge konnte nicht gespeichert werden.');
    } finally {
      setIsSavingProjectOrder(false);
    }
  };

  const handleCategoryDragStart = (event: React.DragEvent<HTMLDivElement>, categoryId: string) => {
    if (!isReorderableCategory(categoryId) || isSavingCategoryOrder) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', categoryId);
    setDraggedCategoryId(categoryId);
    setDragOverCategoryId(categoryId);
  };

  const handleCategoryDragOver = (event: React.DragEvent<HTMLDivElement>, categoryId: string) => {
    if (
      !isReorderableCategory(categoryId) ||
      !draggedCategoryId ||
      draggedCategoryId === categoryId
    ) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragOverCategoryId !== categoryId) {
      setDragOverCategoryId(categoryId);
    }
  };

  const handleCategoryDragEnd = () => {
    setDraggedCategoryId(null);
    setDragOverCategoryId(null);
  };

  const handleCategoryDrop = async (
    event: React.DragEvent<HTMLDivElement>,
    targetCategoryId: string
  ) => {
    if (!isReorderableCategory(targetCategoryId) || isSavingCategoryOrder) {
      return;
    }

    event.preventDefault();
    const sourceCategoryId = event.dataTransfer.getData('text/plain') || draggedCategoryId;
    setDraggedCategoryId(null);
    setDragOverCategoryId(null);

    if (!sourceCategoryId || sourceCategoryId === targetCategoryId) {
      return;
    }

    const previousCategories = categories;
    const nextCategories = moveCategoryInList(
      previousCategories,
      sourceCategoryId,
      targetCategoryId
    );
    if (nextCategories === previousCategories) {
      return;
    }

    setCategories(nextCategories);
    await persistCategoryOrder(nextCategories, previousCategories);
  };

  const handleProjectDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    projectId: string,
    categoryId: string
  ) => {
    if (!canReorderProjectsInCategory(categoryId) || isSavingProjectOrder) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', projectId);
    setDraggedProjectId(projectId);
    setDraggedProjectCategoryId(categoryId);
    setDragOverProjectId(projectId);
  };

  const handleProjectDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    targetProjectId: string,
    categoryId: string
  ) => {
    if (
      !draggedProjectId ||
      draggedProjectCategoryId !== categoryId ||
      draggedProjectId === targetProjectId ||
      isSavingProjectOrder
    ) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragOverProjectId !== targetProjectId) {
      setDragOverProjectId(targetProjectId);
    }
  };

  const handleProjectDragEnd = () => {
    setDraggedProjectId(null);
    setDraggedProjectCategoryId(null);
    setDragOverProjectId(null);
  };

  const handleProjectDrop = async (
    event: React.DragEvent<HTMLDivElement>,
    targetProjectId: string,
    categoryId: string
  ) => {
    if (draggedProjectCategoryId !== categoryId || isSavingProjectOrder) {
      return;
    }

    event.preventDefault();
    const sourceProjectId = event.dataTransfer.getData('text/plain') || draggedProjectId;
    setDraggedProjectId(null);
    setDraggedProjectCategoryId(null);
    setDragOverProjectId(null);

    if (!sourceProjectId || sourceProjectId === targetProjectId) {
      return;
    }

    const fullCategoryProjects = applyStoredProjectOrder(
      allProjectsByCategory[categoryId] || [],
      projectOrderByCategory[categoryId]
    );
    const reorderedProjects = moveProjectInList(
      fullCategoryProjects,
      sourceProjectId,
      targetProjectId
    );

    if (reorderedProjects === fullCategoryProjects) {
      return;
    }

    const previousOrderMap = projectOrderByCategory;
    const nextOrderMap = {
      ...projectOrderByCategory,
      [categoryId]: reorderedProjects.map((project) => project.id),
    };

    setProjectOrderByCategory(nextOrderMap);
    await persistProjectOrder(categoryId, nextOrderMap[categoryId], previousOrderMap);
  };

  // Derive filter options from displayed projects
  const allStatuses = Array.from(
    new Set(displayedProjects.map((p) => (p.status || '').toLowerCase()).filter(Boolean))
  ).sort(
    (left, right) =>
      STATUS_ORDER.indexOf(left as (typeof STATUS_ORDER)[number]) -
      STATUS_ORDER.indexOf(right as (typeof STATUS_ORDER)[number])
  );
  const allTags = Array.from(
    new Set(
      displayedProjects
        .flatMap((project) => project.ProjectFields ?? [])
        .filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right, 'de'));
  const allBadges = Array.from(
    new Set(
      displayedProjects
        .flatMap((project) => project.badges ?? [])
        .filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right, 'de'));
  const allLeads = Array.from(
    new Set(displayedProjects.map((p) => (p.projektleitung || '').trim()).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right, 'de'));
  const allPhases = PHASE_ORDER.filter((phase) =>
    displayedProjects.some((project) => normalizePhaseValue(project.projektphase) === phase)
  );

  // Filter projects by active categories + advanced filters
  const filteredProjects = displayedProjects.filter((project) => {
    const catId = normalizeCategoryId(project.category, categories);
    if (!activeCategories.includes(catId)) return false;

    // Text filter across central metadata
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      const inTitle = project.title?.toLowerCase().includes(q);
      const inDesc = getRichTextPlainText(project.description).toLowerCase().includes(q);
      const inLead = (project.projektleitung || '').toLowerCase().includes(q);
      const inMilestone = (project.naechster_meilenstein || '').toLowerCase().includes(q);
      const inBadges = (project.badges ?? []).some((value) => value.toLowerCase().includes(q));
      const inTags = (project.ProjectFields ?? []).some((value) => value.toLowerCase().includes(q));
      const inTeam = (project.teamMembers ?? []).some((member) =>
        (member.name || '').toLowerCase().includes(q)
      );
      if (!inTitle && !inDesc && !inLead && !inMilestone && !inBadges && !inTags && !inTeam)
        return false;
    }

    // Status filter (if any selected)
    if (statusFilters.length > 0) {
      const s = (project.status || '').toLowerCase();
      if (!statusFilters.includes(s)) return false;
    }

    // Project type filter
    if (projectTypeFilters.length > 0) {
      const projectType = (project.projectType || 'long').toLowerCase();
      if (!projectTypeFilters.includes(projectType)) return false;
    }

    // Phase filter
    if (phaseFilters.length > 0) {
      const phase = normalizePhaseValue(project.projektphase);
      if (!phaseFilters.includes(phase)) return false;
    }

    // Progress bucket filter
    if (progressBucket !== 'all') {
      if (getProgressBucket(project.fortschritt) !== progressBucket) return false;
    }

    // Lead filter
    if (leadFilters.length > 0) {
      const lead = (project.projektleitung || '').trim();
      if (!leadFilters.includes(lead)) return false;
    }

    if (badgeFilters.length > 0) {
      const projectBadges = (project.badges ?? []).map((badge) => badge.toLowerCase());
      const hasAnyBadge = badgeFilters.some((badge) => projectBadges.includes(badge.toLowerCase()));
      if (!hasAnyBadge) return false;
    }

    // Tag filter (ProjectFields contains any of selected)
    if (tagFilters.length > 0) {
      const pf: string[] = (project.ProjectFields ?? []).map((t) => (t || '').toLowerCase());
      const hasAny = tagFilters.some((t) => pf.includes(t.toLowerCase()));
      if (!hasAny) return false;
    }

    if (attributeFilters.length > 0) {
      const attributeChecks: Record<string, boolean> = {
        'with-team': Boolean(project.teamMembers && project.teamMembers.length > 0),
        'with-links': Boolean(project.links && project.links.length > 0),
        'with-owner': Boolean(project.projektleitung && project.projektleitung.trim()),
        'with-milestone': Boolean(
          project.naechster_meilenstein && project.naechster_meilenstein.trim()
        ),
      };

      const matchesAttributes = attributeFilters.every((attribute) => attributeChecks[attribute]);
      if (!matchesAttributes) return false;
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

  const allProjectsByCategory = initialProjects.reduce<Record<string, Project[]>>(
    (acc, project) => {
      const catId = normalizeCategoryId(project.category, categories);
      (acc[catId] ||= []).push(project);
      return acc;
    },
    {}
  );

  // Group projects by category (Bereich)
  const projectsByCategory = filteredProjects.reduce<Record<string, Project[]>>((acc, p) => {
    const catId = normalizeCategoryId(p.category, categories);
    (acc[catId] ||= []).push(p);
    return acc;
  }, {});

  const orderedProjectsByCategory = Object.entries(projectsByCategory).reduce<
    Record<string, Project[]>
  >((acc, [categoryId, projects]) => {
    acc[categoryId] = applyStoredProjectOrder(projects, projectOrderByCategory[categoryId]);
    return acc;
  }, {});

  // Ordered list of visible categories (only those with projects)
  const visibleCategoryIds = [
    ...categories.filter((c) => orderedProjectsByCategory[c.id]?.length).map((c) => c.id),
    ...(orderedProjectsByCategory[UNCATEGORIZED_ID]?.length ? [UNCATEGORIZED_ID] : []),
  ];

  // Get category name by ID
  const getCategoryName = (categoryValue: unknown) => {
    const categoryId = normalizeCategoryId(categoryValue, categories);
    if (categoryId === UNCATEGORIZED_ID) return 'Uncategorized';
    const category = categories.find((cat) => cat.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  // Get category color by ID
  const getCategoryColor = (categoryValue: unknown) => {
    const categoryId = normalizeCategoryId(categoryValue, categories);
    if (categoryId === UNCATEGORIZED_ID) return '#777777';
    const category = categories.find((cat) => cat.id === categoryId);
    return category?.color || '#777777';
  };
  const hoveredProjectDescription = hoveredProject
    ? getRichTextPlainText(hoveredProject.description)
    : '';

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
    if (typeof instanceSlug === 'string' && instanceSlug) {
      void router.push({
        pathname: `/project/${projectId}`,
        query: { [INSTANCE_QUERY_PARAM]: instanceSlug },
      });
      return;
    }
    void router.push(`/project/${encodeURIComponent(projectId)}`);
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

  // Calculate position for year view (multi-year timeline)
  const calculateYearPosition = (project: Project): { startPosition: number; width: number } => {
    if (!project.startDate || !project.endDate) {
      return { startPosition: 0, width: 0 };
    }

    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { startPosition: 0, width: 0 };
    }

    // Display range: currentYear - 2 to currentYear + 2 (5 years total)
    const startYear = currentYear - 2;
    const endYear = currentYear + 2;
    const totalYears = 5;

    const projectStartYear = startDate.getFullYear();
    const projectEndYear = endDate.getFullYear();

    let startPosition = 0;
    let width = 0;

    // Calculate start position
    if (projectStartYear < startYear) {
      // Project started before visible range
      startPosition = 0;
    } else if (projectStartYear <= endYear) {
      // Project starts within visible range
      const yearOffset = projectStartYear - startYear;
      startPosition = (yearOffset / totalYears) * 100;
    } else {
      // Project starts after visible range - don't display
      return { startPosition: 0, width: 0 };
    }

    // Calculate width
    if (projectEndYear > endYear) {
      // Project ends after visible range
      width = 100 - startPosition;
    } else if (projectEndYear >= startYear) {
      // Project ends within visible range
      const endYearOffset = projectEndYear - startYear + 1; // +1 because end is inclusive
      width = (endYearOffset / totalYears) * 100 - startPosition;
    } else {
      // Project ends before visible range - don't display
      return { startPosition: 0, width: 0 };
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
              <button
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition md:flex-none ${viewType === 'years' ? 'bg-sky-500 text-white shadow-sm shadow-sky-900/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                onClick={() => setViewType('years')}
              >
                Jahre
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
                    availableBadges={allBadges}
                    selectedBadges={badgeFilters}
                    onToggleBadge={(badge) =>
                      setBadgeFilters((prev) =>
                        prev.includes(badge)
                          ? prev.filter((entry) => entry !== badge)
                          : [...prev, badge]
                      )
                    }
                    availableTags={allTags}
                    selectedTags={tagFilters}
                    onToggleTag={(t) =>
                      setTagFilters((prev) =>
                        prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                      )
                    }
                    availableLeads={allLeads}
                    selectedLeads={leadFilters}
                    onToggleLead={(lead) =>
                      setLeadFilters((prev) =>
                        prev.includes(lead)
                          ? prev.filter((entry) => entry !== lead)
                          : [...prev, lead]
                      )
                    }
                    availablePhases={allPhases}
                    selectedPhases={phaseFilters}
                    onTogglePhase={(phase) =>
                      setPhaseFilters((prev) =>
                        prev.includes(phase)
                          ? prev.filter((entry) => entry !== phase)
                          : [...prev, phase]
                      )
                    }
                    selectedProjectTypes={projectTypeFilters}
                    onToggleProjectType={(projectType) =>
                      setProjectTypeFilters((prev) =>
                        prev.includes(projectType)
                          ? prev.filter((entry) => entry !== projectType)
                          : [...prev, projectType]
                      )
                    }
                    progressBucket={progressBucket}
                    onProgressBucketChange={setProgressBucket}
                    selectedAttributes={attributeFilters}
                    onToggleAttribute={(attribute) =>
                      setAttributeFilters((prev) =>
                        prev.includes(attribute)
                          ? prev.filter((entry) => entry !== attribute)
                          : [...prev, attribute]
                      )
                    }
                    resultCount={filteredProjects.length}
                    totalCount={displayedProjects.length}
                    onClearAll={() => {
                      setFilterText('');
                      setStatusFilters([]);
                      setBadgeFilters([]);
                      setTagFilters([]);
                      setProjectTypeFilters([]);
                      setPhaseFilters([]);
                      setLeadFilters([]);
                      setAttributeFilters([]);
                      setProgressBucket('all');
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

                {hasReorderControls() && (
                  <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-50">
                    <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-slate-950/40 px-3 py-1 font-medium text-sky-100">
                      <FiGripVertical className="h-4 w-4" />
                      Admin-Modus
                    </span>
                    <span>
                      Kategorien und Projekte innerhalb einer Kategorie lassen sich hier per Drag
                      and Drop neu anordnen.
                    </span>
                    {(isSavingCategoryOrder || isSavingProjectOrder) && (
                      <span className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-xs font-medium text-slate-200">
                        Speichert...
                      </span>
                    )}
                  </div>
                )}

                {categoryOrderError && (
                  <div className="mb-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {categoryOrderError}
                  </div>
                )}

                {projectOrderError && (
                  <div className="mb-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {projectOrderError}
                  </div>
                )}
                {/* Quarter/Month/Week headers */}

                {viewMode === 'timeline' && (
                  <>
                    {/* Quarter/Month/Week headers */}
                    {viewType === 'quarters' ? (
                      <div className="grid grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
                        <div
                          className="roadmap-time-header p-2 md:p-3 rounded-lg text-center font-semibold text-xs md:text-sm"
                          style={{ background: 'linear-gradient(to right, #eab308, #d97706)' }}
                        >
                          Q1 {currentYear}
                        </div>
                        <div
                          className="roadmap-time-header p-2 md:p-3 rounded-lg text-center font-semibold text-xs md:text-sm"
                          style={{ background: 'linear-gradient(to right, #d97706, #ea580c)' }}
                        >
                          Q2 {currentYear}
                        </div>
                        <div
                          className="roadmap-time-header p-2 md:p-3 rounded-lg text-center font-semibold text-xs md:text-sm"
                          style={{ background: 'linear-gradient(to right, #ea580c, #c2410c)' }}
                        >
                          Q3 {currentYear}
                        </div>
                        <div
                          className="roadmap-time-header p-2 md:p-3 rounded-lg text-center font-semibold text-xs md:text-sm"
                          style={{ background: 'linear-gradient(to right, #c2410c, #b91c1c)' }}
                        >
                          Q4 {currentYear}
                        </div>
                      </div>
                    ) : viewType === 'months' ? (
                      <div className="grid grid-cols-12 gap-1 md:gap-2 mb-4 md:mb-6">
                        <div
                          className="roadmap-time-header p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #eab308, #e3a008)' }}
                        >
                          Jan
                        </div>
                        <div
                          className="roadmap-time-header p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #e3a008, #dd9107)' }}
                        >
                          Feb
                        </div>
                        <div
                          className="roadmap-time-header p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #dd9107, #d97706)' }}
                        >
                          Mär
                        </div>
                        <div
                          className="roadmap-time-header p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #d97706, #d57005)' }}
                        >
                          Apr
                        </div>
                        <div
                          className="roadmap-time-header p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #d57005, #d16904)' }}
                        >
                          Mai
                        </div>
                        <div
                          className="roadmap-time-header p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #d16904, #cc6203)' }}
                        >
                          Jun
                        </div>
                        <div
                          className="roadmap-time-header p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #cc6203, #c65b02)' }}
                        >
                          Jul
                        </div>
                        <div
                          className="roadmap-time-header p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #c65b02, #c05401)' }}
                        >
                          Aug
                        </div>
                        <div
                          className="roadmap-time-header p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #c05401, #ba4d01)' }}
                        >
                          Sep
                        </div>
                        <div
                          className="roadmap-time-header p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #ba4d01, #b44600)' }}
                        >
                          Okt
                        </div>
                        <div
                          className="roadmap-time-header p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #b44600, #ae3f00)' }}
                        >
                          Nov
                        </div>
                        <div
                          className="roadmap-time-header p-1 md:p-2 rounded-lg text-center font-semibold text-xs"
                          style={{ background: 'linear-gradient(to right, #ae3f00, #a83800)' }}
                        >
                          Dez
                        </div>
                      </div>
                    ) : viewType === 'weeks' ? (
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
                            className="roadmap-time-header p-1 text-center font-semibold text-xs"
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
                    ) : (
                      <div className="grid grid-cols-5 gap-2 md:gap-4 mb-4 md:mb-6">
                        <div
                          className="roadmap-time-header p-2 md:p-3 rounded-lg text-center font-semibold text-xs md:text-sm"
                          style={{ background: 'linear-gradient(to right, #eab308, #d97706)' }}
                        >
                          {currentYear - 2}
                        </div>
                        <div
                          className="roadmap-time-header p-2 md:p-3 rounded-lg text-center font-semibold text-xs md:text-sm"
                          style={{ background: 'linear-gradient(to right, #d97706, #ea580c)' }}
                        >
                          {currentYear - 1}
                        </div>
                        <div
                          className="roadmap-time-header p-2 md:p-3 rounded-lg text-center font-semibold text-xs md:text-sm"
                          style={{ background: 'linear-gradient(to right, #ea580c, #c2410c)' }}
                        >
                          {currentYear}
                        </div>
                        <div
                          className="roadmap-time-header p-2 md:p-3 rounded-lg text-center font-semibold text-xs md:text-sm"
                          style={{ background: 'linear-gradient(to right, #c2410c, #b91c1c)' }}
                        >
                          {currentYear + 1}
                        </div>
                        <div
                          className="roadmap-time-header p-2 md:p-3 rounded-lg text-center font-semibold text-xs md:text-sm"
                          style={{ background: 'linear-gradient(to right, #b91c1c, #991b1b)' }}
                        >
                          {currentYear + 2}
                        </div>
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
                        const groupProjects = orderedProjectsByCategory[catId] || [];
                        return (
                          <div
                            key={catId}
                            className={getCategorySectionClassName(catId)}
                            onDragOver={(event) => handleCategoryDragOver(event, catId)}
                            onDrop={(event) => void handleCategoryDrop(event, catId)}
                          >
                            {/* Bereich Kopfzeile */}
                            <div className="mb-2 flex items-center gap-3 md:mb-3">
                              {isReorderableCategory(catId) && (
                                <div
                                  draggable={!isSavingCategoryOrder}
                                  onDragStart={(event) => handleCategoryDragStart(event, catId)}
                                  onDragEnd={handleCategoryDragEnd}
                                  className="inline-flex cursor-grab items-center gap-1 rounded-full border border-slate-700/70 bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:border-sky-400 hover:text-white active:cursor-grabbing"
                                  aria-label={`Kategorie ${getCategoryName(catId)} verschieben`}
                                  title="Kategorie verschieben"
                                >
                                  <FiGripVertical className="h-4 w-4" />
                                  <span>Verschieben</span>
                                </div>
                              )}
                              <span
                                className="inline-block h-3 w-3 rounded-full"
                                style={{ backgroundColor: getCategoryColor(catId) }}
                              />
                              <h2 className="text-lg md:text-xl font-semibold m-0">
                                {getCategoryName(catId)}
                              </h2>
                              <span className="roadmap-project-count-badge ml-2 text-xs md:text-sm px-2 py-0.5 rounded-full bg-slate-800/80 border border-white/10 text-slate-200">
                                {groupProjects.length}{' '}
                                {groupProjects.length === 1 ? 'Projekt' : 'Projekte'}
                              </span>
                            </div>

                            {/* Projekte dieser Kategorie */}
                            <div className="space-y-2 md:space-y-4">
                              {groupProjects.map((project) => {
                                const isReorderableProject = canReorderProjectsInCategory(catId);
                                // Use the appropriate position calculation based on view type
                                const { startPosition, width } =
                                  viewType === 'quarters'
                                    ? calculateQuarterPosition(project)
                                    : viewType === 'months'
                                      ? calculateMonthPosition(project)
                                      : viewType === 'weeks'
                                        ? calculateWeekPosition(project)
                                        : calculateYearPosition(project);

                                // Skip projects with invalid positions
                                if (width <= 0) {
                                  return null;
                                }

                                return (
                                  <div
                                    key={project.id}
                                    className={[
                                      'relative mb-1 h-6 md:mb-2 md:h-8',
                                      dragOverProjectId === project.id &&
                                      draggedProjectId !== project.id
                                        ? 'rounded-xl ring-2 ring-sky-400/40'
                                        : '',
                                      draggedProjectId === project.id ? 'opacity-60' : '',
                                    ]
                                      .filter(Boolean)
                                      .join(' ')}
                                    draggable={isReorderableProject && !isSavingProjectOrder}
                                    onDragStart={(event) =>
                                      handleProjectDragStart(event, project.id, catId)
                                    }
                                    onDragOver={(event) =>
                                      handleProjectDragOver(event, project.id, catId)
                                    }
                                    onDrop={(event) =>
                                      void handleProjectDrop(event, project.id, catId)
                                    }
                                    onDragEnd={handleProjectDragEnd}
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
                                      ) : viewType === 'weeks' ? (
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
                                      ) : (
                                        <div className="grid grid-cols-5 gap-2 md:gap-4 h-full">
                                          <div className="bg-slate-800 rounded-lg opacity-30"></div>
                                          <div className="bg-slate-800 rounded-lg opacity-30"></div>
                                          <div className="bg-slate-800 rounded-lg opacity-30"></div>
                                          <div className="bg-slate-800 rounded-lg opacity-30"></div>
                                          <div className="bg-slate-800 rounded-lg opacity-30"></div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Project bar */}
                                    <div
                                      className={`roadmap-project-bar absolute top-0 h-full rounded-lg flex items-center px-1 md:px-3 transition-all hover:brightness-110 group border border-white border-opacity-30 hover:border-opacity-70 ${isReorderableProject ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
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
                                        {isReorderableProject && (
                                          <FiGripVertical className="h-3 w-3 shrink-0 text-white/80" />
                                        )}
                                        <span className="roadmap-project-label font-medium truncate px-1 md:px-2 py-0.5 rounded bg-black bg-opacity-40 text-white group-hover:bg-opacity-60 text-[10px] md:text-sm flex-shrink">
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
                      const groupProjects = orderedProjectsByCategory[catId] || [];
                      return (
                        <div
                          key={catId}
                          className={getCategorySectionClassName(catId)}
                          onDragOver={(event) => handleCategoryDragOver(event, catId)}
                          onDrop={(event) => void handleCategoryDrop(event, catId)}
                        >
                          <div className="mb-3 flex items-center gap-3">
                            {isReorderableCategory(catId) && (
                              <div
                                draggable={!isSavingCategoryOrder}
                                onDragStart={(event) => handleCategoryDragStart(event, catId)}
                                onDragEnd={handleCategoryDragEnd}
                                className="inline-flex cursor-grab items-center gap-1 rounded-full border border-slate-700/70 bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:border-sky-400 hover:text-white active:cursor-grabbing"
                                aria-label={`Kategorie ${getCategoryName(catId)} verschieben`}
                                title="Kategorie verschieben"
                              >
                                <FiGripVertical className="h-4 w-4" />
                                <span>Verschieben</span>
                              </div>
                            )}
                            <span
                              className="inline-block h-3 w-3 rounded-full"
                              style={{ backgroundColor: getCategoryColor(catId) }}
                            />
                            <h2 className="text-lg md:text-xl font-semibold m-0">
                              {getCategoryName(catId)}
                            </h2>
                            <span className="roadmap-project-count-badge ml-2 rounded-full border border-slate-700/70 bg-slate-900/80 px-2 py-0.5 text-xs text-slate-200 md:text-sm">
                              {groupProjects.length}{' '}
                              {groupProjects.length === 1 ? 'Projekt' : 'Projekte'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                            {groupProjects.map((project) => {
                              const isReorderableProject = canReorderProjectsInCategory(catId);

                              return (
                                <div
                                  key={project.id}
                                  className={[
                                    'relative',
                                    dragOverProjectId === project.id &&
                                    draggedProjectId !== project.id
                                      ? 'rounded-2xl ring-2 ring-sky-400/40'
                                      : '',
                                    draggedProjectId === project.id ? 'opacity-60' : '',
                                  ]
                                    .filter(Boolean)
                                    .join(' ')}
                                  draggable={isReorderableProject && !isSavingProjectOrder}
                                  onDragStart={(event) =>
                                    handleProjectDragStart(event, project.id, catId)
                                  }
                                  onDragOver={(event) =>
                                    handleProjectDragOver(event, project.id, catId)
                                  }
                                  onDrop={(event) =>
                                    void handleProjectDrop(event, project.id, catId)
                                  }
                                  onDragEnd={handleProjectDragEnd}
                                >
                                  {isReorderableProject && (
                                    <div className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/70 px-2 py-1 text-[11px] font-medium text-slate-100 shadow-lg shadow-slate-950/30">
                                      <FiGripVertical className="h-3.5 w-3.5" />
                                      <span>Verschieben</span>
                                    </div>
                                  )}
                                  <CompactProjectCard
                                    project={project}
                                    categoryName={getCategoryName(catId)}
                                    categoryColor={getCategoryColor(catId)}
                                    onClick={handleProjectClick}
                                  />
                                </div>
                              );
                            })}
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
            className="theme-roadmap-tooltip fixed z-50 w-[300px] pointer-events-none rounded-xl border border-slate-800/70 bg-gradient-to-b from-slate-950/95 to-slate-900/95 p-3 text-white shadow-2xl shadow-slate-950/50 backdrop-blur-sm md:w-[360px] md:p-4 animate-fadeIn"
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
            {hoveredProjectDescription && (
              <p className="text-xs md:text-[13px] text-gray-200 leading-snug mb-3 line-clamp-4">
                {hoveredProjectDescription}
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
