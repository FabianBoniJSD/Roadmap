import clsx from 'clsx';
import { forceServerSideRendering } from '@/utils/serverRendering';

export const getServerSideProps = forceServerSideRendering;
import Head from 'next/head';
import Link from 'next/link';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import {
  FiBookOpen,
  FiExternalLink,
  FiLogOut,
  FiPlus,
  FiRefreshCw,
  FiShield,
} from 'react-icons/fi';
import JSDoITLoader from '@/components/JSDoITLoader';
import RichTextContent from '@/components/RichTextContent';
import SharePointUserPicker from '@/components/SharePointUserPicker';
import SiteHeader from '@/components/SiteHeader';
import withAdminAuth from '@/components/withAdminAuth';
import { AppSettings, Category, Project } from '@/types';
import {
  getAdminUsername,
  getCurrentBrowserInstanceSlug,
  hasValidAdminSession,
  logout,
} from '@/utils/auth';
import { normalizeCategoryId, resolveCategoryName, UNCATEGORIZED_ID } from '@/utils/categoryUtils';
import { INSTANCE_QUERY_PARAM } from '@/utils/instanceConfig';
import {
  getProjectSaveNoticeMessage,
  parseProjectSaveNotice,
  PROJECT_SAVE_NOTICE_PARAM,
  PROJECT_SAVE_PUBLISHED_PARAM,
} from '@/utils/projectSaveNotice';

type AdminTab = 'projects' | 'categories' | 'settings';

const STATUS_LABELS: Record<string, string> = {
  completed: 'Abgeschlossen',
  'in-progress': 'In Umsetzung',
  planned: 'Geplant',
  paused: 'Pausiert',
  cancelled: 'Gestoppt',
};

const STATUS_STYLES: Record<string, string> = {
  completed:
    'ds-admin-status-completed [border-color:color-mix(in_srgb,_var(--ds-success)_52%,_var(--ds-border-default))] [background:color-mix(in_srgb,_var(--ds-success)_13%,_transparent)] [color:var(--ds-success)]',
  'in-progress':
    'ds-admin-status-active [border-color:color-mix(in_srgb,_var(--ds-accent-strong)_52%,_var(--ds-border-default))] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]',
  planned: 'ds-admin-status-planned [color:var(--ds-text-muted)]',
  paused:
    'ds-admin-status-paused [border-color:color-mix(in_srgb,_var(--ds-warning)_52%,_var(--ds-border-default))] [background:color-mix(in_srgb,_var(--ds-warning)_12%,_transparent)] [color:var(--ds-warning)]',
  cancelled:
    'ds-admin-status-cancelled [border-color:color-mix(in_srgb,_var(--ds-danger)_52%,_var(--ds-border-default))] [background:color-mix(in_srgb,_var(--ds-danger)_12%,_transparent)] [color:var(--ds-danger)]',
};

const AdminShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <Head>
      <title>Admin | JSDoIT Roadmap</title>
    </Head>

    <div className="ds-page-shell before:[position:absolute] before:[inset:0] before:[z-index:0] before:[pointer-events:none] before:[background-size:56px_56px] after:[position:absolute] after:[right:-10%] after:[bottom:-25%] after:[left:-10%] after:[z-index:0] after:[height:38vh] after:[pointer-events:none] [position:relative] [isolation:isolate] [display:flex] [min-height:100vh] [flex-direction:column] [overflow:hidden] [background:var(--ds-bg-page)] [color:var(--ds-text-default)] [font-family:var(--ds-font-sans)] [&>*]:[position:relative] [&>*]:[z-index:1]">
      <SiteHeader activeRoute="admin" />
      {children}
      <footer className="ds-footer [border-top:1px_solid_var(--ds-border-subtle)] [background:color-mix(in_srgb,_var(--ds-bg-page)_82%,_transparent)] ">
        <div className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-footer-inner [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-4)] [padding-block:24px] [color:var(--ds-text-muted)] [font-size:0.875rem] max-[760px]:[align-items:flex-start] max-[760px]:[flex-direction:column]">
          <span>JSDoIT Roadmap Center</span>
          <div className="ds-footer-links [display:flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-4)]">
            <Link
              className="ds-footer-link [color:var(--ds-text-muted)] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
              href="/instances"
            >
              Instanzen
            </Link>
            <Link
              className="ds-footer-link [color:var(--ds-text-muted)] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
              href="/help/admin"
            >
              Admin-Handbuch
            </Link>
            <Link
              className="ds-footer-link [color:var(--ds-text-muted)] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
              href="/roadmap"
            >
              Roadmap
            </Link>
          </div>
        </div>
      </footer>
    </div>
  </>
);

const AdminPage: React.FC = () => {
  const router = useRouter();
  const instanceSlug = Array.isArray(router.query?.[INSTANCE_QUERY_PARAM])
    ? router.query[INSTANCE_QUERY_PARAM][0]
    : typeof router.query?.[INSTANCE_QUERY_PARAM] === 'string'
      ? router.query[INSTANCE_QUERY_PARAM]
      : '';
  const pushWithInstance = (pathname: string) => router.push({ pathname, query: router.query });
  const roadmapHref = instanceSlug
    ? { pathname: '/roadmap', query: { [INSTANCE_QUERY_PARAM]: instanceSlug } }
    : '/roadmap';
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AppSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('projects');
  const [editingSetting, setEditingSetting] = useState<AppSettings | null>(null);
  const [newSettingValue, setNewSettingValue] = useState('');
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [instanceAdminUsers, setInstanceAdminUsers] = useState<string[]>([]);
  const [instanceAdminLoading, setInstanceAdminLoading] = useState(false);
  const [instanceAdminSaving, setInstanceAdminSaving] = useState(false);
  const [instanceAdminError, setInstanceAdminError] = useState<string | null>(null);
  const [projectSaveNotice, setProjectSaveNotice] = useState<string | null>(null);
  const fetchRequestIdRef = useRef(0);
  const effectiveInstanceSlug = instanceSlug || getCurrentBrowserInstanceSlug() || '';

  useEffect(() => {
    if (!router.isReady) return;

    const notice = parseProjectSaveNotice(router.query);
    if (!notice) return;

    setProjectSaveNotice(getProjectSaveNoticeMessage(notice));

    const cleanedQuery = { ...router.query };
    delete cleanedQuery[PROJECT_SAVE_NOTICE_PARAM];
    delete cleanedQuery[PROJECT_SAVE_PUBLISHED_PARAM];
    void router.replace({ pathname: router.pathname, query: cleanedQuery }, undefined, {
      shallow: true,
      scroll: false,
    });
  }, [router.isReady, router.query, router.pathname, router]);

  useEffect(() => {
    if (!projectSaveNotice) return;
    const timeoutId = window.setTimeout(() => setProjectSaveNotice(null), 10000);
    return () => window.clearTimeout(timeoutId);
  }, [projectSaveNotice]);

  const buildApiUrl = useCallback(
    (path: string) => {
      if (!instanceSlug) return path;
      const separator = path.includes('?') ? '&' : '?';
      return `${path}${separator}${INSTANCE_QUERY_PARAM}=${encodeURIComponent(instanceSlug)}`;
    },
    [instanceSlug]
  );

  const getAuthHeaders = () => {
    return {};
  };

  useEffect(() => {
    if (!router.isReady) return;

    const requestId = ++fetchRequestIdRef.current;
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [projectsResp, categoriesResp, settingsResp] = await Promise.all([
          fetch(buildApiUrl('/api/projects'), {
            credentials: 'same-origin',
            headers: { Accept: 'application/json', ...getAuthHeaders() },
          }),
          fetch(buildApiUrl('/api/categories'), {
            credentials: 'same-origin',
            headers: { Accept: 'application/json', ...getAuthHeaders() },
          }),
          fetch(buildApiUrl('/api/settings'), {
            credentials: 'same-origin',
            headers: { Accept: 'application/json', ...getAuthHeaders() },
          }),
        ]);

        if (!projectsResp.ok || !categoriesResp.ok || !settingsResp.ok) {
          const projectPayload = await projectsResp.json().catch(() => null);
          const categoryPayload = await categoriesResp.json().catch(() => null);
          const settingsPayload = await settingsResp.json().catch(() => null);
          throw new Error(
            projectPayload?.error ||
              categoryPayload?.error ||
              settingsPayload?.message ||
              `Fehler beim Laden der Admin-Daten (${projectsResp.status}/${categoriesResp.status}/${settingsResp.status})`
          );
        }

        const [projectData, categoryData, settingsData] = await Promise.all([
          projectsResp.json(),
          categoriesResp.json(),
          settingsResp.json(),
        ]);

        const normalizedProjects = Array.isArray(projectData)
          ? projectData.map((project) => ({
              ...project,
              category: normalizeCategoryId(project.category, categoryData),
            }))
          : projectData;

        if (requestId !== fetchRequestIdRef.current) return;

        setProjects(normalizedProjects);
        setCategories(categoryData);
        setSettings(settingsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        if (requestId !== fetchRequestIdRef.current) return;
        setError('Die Daten konnten nicht geladen werden.');
      } finally {
        if (requestId !== fetchRequestIdRef.current) return;
        setLoading(false);
      }
    };

    fetchData();
    // Refetch whenever the route (and thus instance query) changes to avoid stale data
  }, [buildApiUrl, instanceSlug, router.asPath, router.isReady]);

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const hasAccess = await hasValidAdminSession();
        if (!hasAccess) {
          setError(
            'Sie haben keine Admin-Berechtigung. Bitte wenden Sie sich an Ihr Roadmap-Team.'
          );
          setLoading(false);
        }
      } catch (err) {
        console.error('Error verifying admin access:', err);
        setError('Fehler bei der Prüfung der Admin-Berechtigung.');
        setLoading(false);
      }
    };

    verifyAccess();
  }, [router]);

  useEffect(() => {
    setAdminUsername(getAdminUsername());
  }, []);

  const fetchInstanceAdmins = useCallback(async () => {
    if (!effectiveInstanceSlug) {
      setInstanceAdminUsers([]);
      setInstanceAdminError(null);
      return;
    }
    setInstanceAdminLoading(true);
    setInstanceAdminError(null);
    try {
      const resp = await fetch(buildApiUrl('/api/instance-admin-users'), {
        credentials: 'same-origin',
        headers: { Accept: 'application/json', ...getAuthHeaders() },
      });
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(payload?.error || 'Instanz-Admins konnten nicht geladen werden.');
      }
      setInstanceAdminUsers(Array.isArray(payload?.users) ? payload.users : []);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Instanz-Admins konnten nicht geladen werden.';
      setInstanceAdminError(message);
      setInstanceAdminUsers([]);
    } finally {
      setInstanceAdminLoading(false);
    }
  }, [buildApiUrl, effectiveInstanceSlug]);

  useEffect(() => {
    void fetchInstanceAdmins();
  }, [fetchInstanceAdmins]);

  useEffect(() => {
    if (!categories.length) return;
    setProjects((prev) =>
      prev.map((project) => ({
        ...project,
        category: normalizeCategoryId(project.category, categories),
      }))
    );
  }, [categories]);

  const handleAddProject = () => pushWithInstance('/admin/projects/new');
  const handleViewProject = (projectId: string) =>
    pushWithInstance(`/project/${encodeURIComponent(projectId)}`);
  const handleEditProject = (projectId: string) =>
    pushWithInstance(`/admin/projects/edit/${encodeURIComponent(projectId)}`);

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('Möchten Sie dieses Projekt wirklich löschen?')) return;
    try {
      const resp = await fetch(buildApiUrl(`/api/projects/${encodeURIComponent(id)}`), {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: getAuthHeaders(),
      });
      if (!resp.ok) {
        const payload = await resp.json().catch(() => null);
        throw new Error(payload?.error || 'Projekt konnte nicht gelöscht werden.');
      }
      setProjects((prev) => prev.filter((project) => project.id !== id));
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Projekt konnte nicht gelöscht werden.');
    }
  };

  const handleAddCategory = () => pushWithInstance('/admin/categories/new');
  const handleEditCategory = (categoryId: string) =>
    pushWithInstance(`/admin/categories/edit/${categoryId}`);

  const handleDeleteCategory = async (categoryId: string) => {
    if (deleteConfirmation !== categoryId) {
      setDeleteConfirmation(categoryId);
      return;
    }

    try {
      const resp = await fetch(buildApiUrl(`/api/categories/${encodeURIComponent(categoryId)}`), {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: getAuthHeaders(),
      });
      if (!resp.ok) {
        const payload = await resp.json().catch(() => null);
        throw new Error(payload?.error || 'Kategorie konnte nicht gelöscht werden.');
      }
      setCategories((prev) => prev.filter((category) => category.id !== categoryId));
      setDeleteConfirmation(null);
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Kategorie konnte nicht gelöscht werden.');
    }
  };

  const getCategoryName = (categoryValue: string) => {
    const normalizedId = normalizeCategoryId(categoryValue, categories);
    if (normalizedId === UNCATEGORIZED_ID) return 'Unkategorisiert';

    const byId = categories.find((cat) => cat.id === normalizedId);
    if (byId) return byId.name;

    if (!categoryValue) return 'Unkategorisiert';

    const fallback = resolveCategoryName(categoryValue, categories, {
      emptyLabel: 'Unkategorisiert',
      unknownLabel: categoryValue,
      preferRawFallback: true,
    });

    return fallback?.trim() ? fallback : categoryValue || 'Unbekannt';
  };

  const getStatusBadgeClass = (status: string) => STATUS_STYLES[status] ?? STATUS_STYLES.planned;

  const getStatusLabel = (status: string) => STATUS_LABELS[status] ?? 'Unbekannt';

  const handleEditSetting = (setting: AppSettings) => {
    setEditingSetting(setting);
    setNewSettingValue(setting.value);
  };

  const handleSaveSetting = async () => {
    if (!editingSetting) return;

    try {
      const updatedSetting = {
        ...editingSetting,
        value: newSettingValue,
      };

      const resp = await fetch(
        buildApiUrl(`/api/settings/${encodeURIComponent(editingSetting.id)}`),
        {
          method: 'PUT',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(updatedSetting),
        }
      );
      if (!resp.ok) {
        const payload = await resp.json().catch(() => null);
        throw new Error(payload?.message || 'Einstellung konnte nicht gespeichert werden.');
      }
      const saved = (await resp.json()) as AppSettings;
      setSettings((prev) => prev.map((setting) => (setting.id === saved.id ? saved : setting)));
      setEditingSetting(null);
      setNewSettingValue('');
    } catch (err) {
      console.error('Error updating setting:', err);
      setError('Einstellung konnte nicht gespeichert werden.');
    }
  };

  const handleCancelEdit = () => {
    setEditingSetting(null);
    setNewSettingValue('');
  };

  const handleLogout = () => {
    if (!window.confirm('Möchten Sie sich wirklich abmelden?')) return;
    logout();
  };

  const addInstanceAdmin = async (username: string) => {
    if (!username.trim()) return;
    setInstanceAdminSaving(true);
    setInstanceAdminError(null);
    try {
      const resp = await fetch(buildApiUrl('/api/instance-admin-users'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ username }),
      });
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(payload?.error || 'Instanz-Admin konnte nicht gespeichert werden.');
      }
      setInstanceAdminUsers(Array.isArray(payload?.users) ? payload.users : []);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Instanz-Admin konnte nicht gespeichert werden.';
      setInstanceAdminError(message);
    } finally {
      setInstanceAdminSaving(false);
    }
  };

  const removeInstanceAdmin = async (username: string) => {
    if (!window.confirm(`Instanz-Admin "${username}" wirklich entfernen?`)) return;
    setInstanceAdminSaving(true);
    setInstanceAdminError(null);
    try {
      const resp = await fetch(
        `${buildApiUrl('/api/instance-admin-users')}${buildApiUrl('/api/instance-admin-users').includes('?') ? '&' : '?'}username=${encodeURIComponent(username)}`,
        {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: getAuthHeaders(),
        }
      );
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(payload?.error || 'Instanz-Admin konnte nicht entfernt werden.');
      }
      setInstanceAdminUsers(Array.isArray(payload?.users) ? payload.users : []);
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : 'Instanz-Admin konnte nicht entfernt werden.';
      setInstanceAdminError(message);
    } finally {
      setInstanceAdminSaving(false);
    }
  };

  const stats = [
    {
      label: 'Projekte',
      value: projects.length,
    },
    {
      label: 'Kategorien',
      value: categories.length,
    },
    {
      label: 'Einstellungen',
      value: settings.length,
    },
  ];

  if (loading) {
    return (
      <AdminShell>
        <main className="ds-page-main [flex:1] ds-admin-state-main [flex:1] [display:flex] [align-items:center]">
          <section className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-centered-state [display:flex] [justify-content:center] [padding-block:var(--ds-space-8)]">
            <div className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-admin-state-card [display:grid] [width:min(100%,_520px)] [justify-items:center] [gap:var(--ds-space-4)] [padding:34px] [text-align:center] [&.is-danger]:[border-color:color-mix(in_srgb,_var(--ds-danger)_42%,_var(--ds-border-default))] [&_h1]:[margin:0] [&_h1]:[color:var(--ds-text-strong)] [&_h1]:[font-size:1.35rem] [&_h1]:[font-weight:600] [&_p]:[margin:0] [&_p]:[color:var(--ds-danger)] [&_p]:[line-height:1.6]">
              <JSDoITLoader sizeRem={2.8} message="Adminbereich wird geladen …" />
            </div>
          </section>
        </main>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell>
        <main className="ds-page-main [flex:1] ds-admin-state-main [flex:1] [display:flex] [align-items:center]">
          <section className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-centered-state [display:flex] [justify-content:center] [padding-block:var(--ds-space-8)]">
            <div className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-admin-state-card [display:grid] [width:min(100%,_520px)] [justify-items:center] [gap:var(--ds-space-4)] [padding:34px] [text-align:center] [&.is-danger]:[border-color:color-mix(in_srgb,_var(--ds-danger)_42%,_var(--ds-border-default))] [&_h1]:[margin:0] [&_h1]:[color:var(--ds-text-strong)] [&_h1]:[font-size:1.35rem] [&_h1]:[font-weight:600] [&_p]:[margin:0] [&_p]:[color:var(--ds-danger)] [&_p]:[line-height:1.6] is-danger">
              <h1>Es ist ein Fehler aufgetreten</h1>
              <p>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
              >
                <FiRefreshCw className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                Erneut versuchen
              </button>
            </div>
          </section>
        </main>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <main className="ds-page-main [flex:1] ds-admin-page-main [flex:1] [padding-block:clamp(34px,_5vw,_64px)_72px]">
        <div className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-admin-dashboard [display:grid] [gap:var(--ds-space-6)]">
          {projectSaveNotice && (
            <div
              className="ds-message [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-4)] [padding:16px_18px] [border:1px_solid_color-mix(in_srgb,_var(--ds-success)_42%,_var(--ds-border-default))] [border-radius:var(--ds-radius-md)] [background:color-mix(in_srgb,_var(--ds-success)_13%,_var(--ds-bg-elevated))] [color:var(--ds-text-strong)] "
              role="status"
              aria-live="polite"
            >
              <span>{projectSaveNotice}</span>
              <button
                type="button"
                onClick={() => setProjectSaveNotice(null)}
                className="[min-height:44px] [padding-inline:14px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [color:var(--ds-text-default)] [font-size:0.8125rem] [font-weight:600] hover:[border-color:var(--ds-border-strong)] hover:[color:var(--ds-text-strong)]"
                aria-label="Erfolgsmeldung schließen"
              >
                Schließen
              </button>
            </div>
          )}
          <header className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-admin-hero [display:grid] [grid-template-columns:minmax(0,_1fr)_minmax(220px,_280px)] [gap:clamp(24px,_4vw,_48px)] [align-items:start] [padding:clamp(28px,_4vw,_42px)] [border-radius:var(--ds-radius-xl)]">
            <div className="ds-admin-hero-content">
              <div className="ds-eyebrow [display:inline-flex] [width:fit-content] [align-items:center] [gap:10px] [padding:9px_15px] [border:1px_solid_var(--ds-border-strong)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-accent-soft)] [color:var(--ds-text-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none] [&_svg]:[color:var(--ds-accent-strong)]">
                <FiShield className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                Administration
              </div>
              <h1 className="ds-admin-title [max-width:760px] [margin:22px_0_18px] [color:var(--ds-text-strong)] [font-size:clamp(2.25rem,_4.8vw,_4rem)] [font-weight:600] [line-height:1] [text-wrap:balance]">
                Roadmap Admin-Dashboard
              </h1>
              <p className="ds-admin-copy [margin:0] [color:var(--ds-text-default)] [line-height:1.7] [max-width:760px] [font-size:1rem]">
                Verwalten Sie Projekte, Kategorien und Instanz-Einstellungen an einem Ort.
                Änderungen werden sofort in der Roadmap sichtbar. Transparente Pflege sorgt für
                Vertrauen bei allen Stakeholdern.
              </p>

              {adminUsername && (
                <p className="ds-admin-user [margin:20px_0_0] [color:var(--ds-text-muted)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none] [&_span]:[color:var(--ds-text-strong)]">
                  Angemeldet als <span>{adminUsername}</span>
                </p>
              )}
            </div>

            <div className="ds-admin-hero-actions [display:grid] [gap:var(--ds-space-3)]">
              <Link
                href="/help/admin"
                className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
              >
                <FiBookOpen className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                Admin-Handbuch
              </Link>
              <Link
                href={roadmapHref}
                className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
              >
                <FiExternalLink className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                Zur Roadmap
              </Link>
              <button
                onClick={handleLogout}
                className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)] ds-button-danger [border-color:color-mix(in_srgb,_var(--ds-danger)_48%,_var(--ds-border-default))] [color:var(--ds-danger)] hover:[border-color:color-mix(in_srgb,_var(--ds-danger)_72%,_var(--ds-border-strong))] hover:[background:color-mix(in_srgb,_var(--ds-danger)_12%,_var(--ds-bg-elevated))]"
              >
                <FiLogOut className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                Abmelden
              </button>
            </div>
          </header>

          <section className="ds-admin-stat-grid [display:grid] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [gap:var(--ds-space-4)]">
            {stats.map((stat) => (
              <article
                key={stat.label}
                className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-admin-stat-card [padding:24px] [border-radius:var(--ds-radius-xl)] [text-align:center]"
              >
                <p className="ds-admin-stat-label [margin:0] [color:var(--ds-text-muted)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                  {stat.label}
                </p>
                <p className="ds-admin-stat-value [margin:10px_0_0] [color:var(--ds-text-strong)] [font-size:2.5rem] [font-weight:600] [line-height:1]">
                  {stat.value}
                </p>
              </article>
            ))}
          </section>

          <section className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-admin-access-panel [padding:clamp(24px,_4vw,_34px)] [border-radius:var(--ds-radius-xl)]">
            <div className="ds-admin-access-header [display:grid] [grid-template-columns:minmax(0,_1fr)_minmax(300px,_520px)] [gap:var(--ds-space-6)] [align-items:start]">
              <div>
                <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                  Instanz-Admins
                </p>
                <h2 className="ds-panel-title [margin:0] [color:var(--ds-text-strong)] [font-size:clamp(1.5rem,_3vw,_2.125rem)] [letter-spacing:-0.04em] [line-height:1.15]">
                  Adminrechte für diese Instanz vergeben
                </h2>
                <p className="ds-admin-section-copy [margin:0] [color:var(--ds-text-default)] [line-height:1.7]">
                  Benutzer mit Abteilungszugriff sehen die Roadmap nur lesend. Adminrechte entstehen
                  ausschließlich über diese Liste, konfigurierte Admin-Gruppen oder
                  Superadminrechte.
                </p>
                <p className="ds-admin-instance-label [margin:20px_0_0] [color:var(--ds-text-muted)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                  Aktive Instanz: {effectiveInstanceSlug || 'nicht ausgewählt'}
                </p>
              </div>

              <div className="ds-admin-user-picker [display:grid] [gap:var(--ds-space-3)]">
                <SharePointUserPicker
                  instanceSlug={effectiveInstanceSlug || null}
                  disabled={instanceAdminSaving || !effectiveInstanceSlug}
                  placeholder="Benutzer als Instanz-Admin suchen …"
                  onSelect={(user) => void addInstanceAdmin(user.value)}
                  emptyMessage="Keine passenden SharePoint-Benutzer gefunden."
                />
                {instanceAdminError ? (
                  <div className="ds-message [margin-bottom:var(--ds-space-6)] [padding:16px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-default)] [font-size:0.875rem] ds-message-danger [border-color:color-mix(in_srgb,_var(--ds-danger)_38%,_transparent)] [background:color-mix(in_srgb,_var(--ds-danger)_12%,_transparent)] [color:var(--ds-danger)] ds-admin-inline-message [margin:0]">
                    {instanceAdminError}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="ds-admin-user-list [display:grid] [gap:var(--ds-space-3)] [margin-top:24px]">
              {instanceAdminLoading ? (
                <p className="ds-admin-muted [color:var(--ds-text-muted)]">Lade Instanz-Admins …</p>
              ) : instanceAdminUsers.length === 0 ? (
                <p className="ds-admin-muted [color:var(--ds-text-muted)]">
                  Noch keine zusätzlichen Instanz-Admins gepflegt.
                </p>
              ) : (
                instanceAdminUsers.map((username) => (
                  <div
                    key={username}
                    className="ds-admin-user-row [display:flex] [flex-wrap:wrap] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-3)] [padding:16px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-soft)]"
                  >
                    <div>
                      <div className="ds-admin-row-title [color:var(--ds-text-strong)] [font-weight:600]">
                        {username}
                      </div>
                      <div className="ds-admin-row-copy [margin-top:5px] [color:var(--ds-text-muted)] [font-size:0.8125rem] [line-height:1.45]">
                        Darf diese Instanz administrieren, auch ohne Superadminrolle.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeInstanceAdmin(username)}
                      disabled={instanceAdminSaving}
                      className={clsx(
                        'ds-admin-action-link [color:var(--ds-accent-strong)] [font-size:0.8125rem] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)] [&.is-danger]:[color:var(--ds-danger)] [&.is-muted]:[color:var(--ds-text-muted)] [&.is-disabled]:[color:var(--ds-text-muted)] [&.is-disabled]:[cursor:not-allowed] [&.is-disabled]:[opacity:0.6] [&.is-confirming]:[color:var(--ds-warning)] is-danger',
                        instanceAdminSaving && 'is-disabled'
                      )}
                    >
                      Entfernen
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="ds-admin-tab-section [display:grid] [gap:var(--ds-space-4)]">
            <div
              className="ds-admin-tabs [display:flex] [flex-wrap:wrap] [gap:var(--ds-space-3)]"
              role="tablist"
              aria-label="Adminbereiche"
            >
              {(['projects', 'categories', 'settings'] as AdminTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'ds-admin-tab [min-height:44px] [padding-inline:18px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-muted)] [font-size:0.875rem] [font-weight:600] [transition:border-color_var(--ds-duration-fast)_var(--ds-ease-out),_background_var(--ds-duration-fast)_var(--ds-ease-out),_color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] hover:[background:var(--ds-accent-soft)] hover:[color:var(--ds-text-strong)] [&.is-active]:[border-color:var(--ds-border-strong)] [&.is-active]:[background:var(--ds-accent-soft)] [&.is-active]:[color:var(--ds-text-strong)]',
                    activeTab === tab && 'is-active'
                  )}
                >
                  {tab === 'projects' && 'Projekte'}
                  {tab === 'categories' && 'Kategorien'}
                  {tab === 'settings' && 'Einstellungen'}
                </button>
              ))}
            </div>

            {activeTab === 'projects' && (
              <div
                className="ds-admin-tab-panel [display:grid] [gap:var(--ds-space-4)]"
                role="tabpanel"
              >
                <div className="ds-admin-panel-actions [display:flex] [justify-content:flex-end]">
                  <button
                    onClick={handleAddProject}
                    className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
                  >
                    <FiPlus className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                    Neues Projekt
                  </button>
                </div>

                <div className="ds-admin-table-card [overflow-x:auto] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-xl)] [background:color-mix(in_srgb,_var(--ds-bg-elevated-strong)_76%,_transparent)] ">
                  <table className="ds-admin-table [width:100%] [min-width:760px] [border-collapse:collapse] [color:var(--ds-text-default)] [font-size:0.875rem] [text-align:left] [&_th]:[padding:16px_18px] [&_th]:[border-bottom:1px_solid_var(--ds-border-subtle)] [&_th]:[vertical-align:top] [&_td]:[padding:16px_18px] [&_td]:[border-bottom:1px_solid_var(--ds-border-subtle)] [&_td]:[vertical-align:top] [&_th]:[background:var(--ds-bg-soft)] [&_th]:[color:var(--ds-text-muted)] [&_th]:[font-size:0.75rem] [&_th]:[font-weight:600] [&_th]:[letter-spacing:normal] [&_th]:[text-transform:none] [&_tr:last-child_td]:[border-bottom:0] [&_tbody_tr]:[transition:background_var(--ds-duration-fast)_var(--ds-ease-out)] [&_tbody_tr:hover]:[background:var(--ds-bg-soft)] [&_.is-right]:[text-align:right]">
                    <thead>
                      <tr>
                        <th>Titel</th>
                        <th>Kategorie</th>
                        <th>Zeitraum</th>
                        <th>Status</th>
                        <th className="is-right">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((project) => (
                        <tr key={project.id}>
                          <td>
                            <div className="ds-admin-table-title [color:var(--ds-text-strong)] [font-weight:600] [display:inline-flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-2)]">
                              {project.title || '(Ohne Titel)'}
                              {project.isReadOnlyMirror && (
                                <span className="ds-admin-mirror-badge [display:inline-flex] [align-items:center] [gap:var(--ds-space-2)] [padding:7px_10px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [font-size:0.6875rem] [font-weight:600] [letter-spacing:normal] [text-transform:none] [border-color:color-mix(in_srgb,_var(--ds-warning)_52%,_var(--ds-border-default))] [background:color-mix(in_srgb,_var(--ds-warning)_12%,_transparent)] [color:var(--ds-warning)]">
                                  Read-only Spiegelung
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{getCategoryName(project.category)}</td>
                          <td>
                            {project.startQuarter || project.startDate || '—'} –{' '}
                            {project.endQuarter || project.endDate || '—'}
                          </td>
                          <td>
                            <span
                              className={clsx(
                                'ds-admin-status [display:inline-flex] [align-items:center] [gap:var(--ds-space-2)] [padding:7px_10px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [font-size:0.6875rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]',
                                getStatusBadgeClass(project.status)
                              )}
                            >
                              {getStatusLabel(project.status)}
                            </span>
                          </td>
                          <td className="is-right">
                            {project.isReadOnlyMirror ? (
                              <button
                                type="button"
                                onClick={() => handleViewProject(project.id)}
                                className="ds-admin-action-link [color:var(--ds-accent-strong)] [font-size:0.8125rem] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
                              >
                                Details ansehen
                              </button>
                            ) : (
                              <div className="ds-admin-table-actions [display:inline-flex] [flex-wrap:wrap] [justify-content:flex-end] [gap:var(--ds-space-3)]">
                                <button
                                  onClick={() => handleEditProject(project.id)}
                                  className="ds-admin-action-link [color:var(--ds-accent-strong)] [font-size:0.8125rem] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)] [&.is-danger]:[color:var(--ds-danger)] [&.is-muted]:[color:var(--ds-text-muted)] [&.is-disabled]:[color:var(--ds-text-muted)] [&.is-disabled]:[cursor:not-allowed] [&.is-disabled]:[opacity:0.6] [&.is-confirming]:[color:var(--ds-warning)]"
                                >
                                  Bearbeiten
                                </button>
                                <button
                                  onClick={() => handleDeleteProject(project.id)}
                                  className="ds-admin-action-link [color:var(--ds-accent-strong)] [font-size:0.8125rem] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)] [&.is-danger]:[color:var(--ds-danger)] [&.is-muted]:[color:var(--ds-text-muted)] [&.is-disabled]:[color:var(--ds-text-muted)] [&.is-disabled]:[cursor:not-allowed] [&.is-disabled]:[opacity:0.6] [&.is-confirming]:[color:var(--ds-warning)] is-danger"
                                >
                                  Löschen
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {projects.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="ds-admin-empty-row [color:var(--ds-text-muted)] [text-align:center]"
                          >
                            Noch keine Projekte vorhanden.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'categories' && (
              <div
                className="ds-admin-tab-panel [display:grid] [gap:var(--ds-space-4)]"
                role="tabpanel"
              >
                <div className="ds-admin-panel-actions [display:flex] [justify-content:flex-end]">
                  <button
                    onClick={handleAddCategory}
                    className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
                  >
                    <FiPlus className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                    Neue Kategorie
                  </button>
                </div>

                <div className="ds-admin-table-card [overflow-x:auto] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-xl)] [background:color-mix(in_srgb,_var(--ds-bg-elevated-strong)_76%,_transparent)] ">
                  <table className="ds-admin-table [width:100%] [min-width:760px] [border-collapse:collapse] [color:var(--ds-text-default)] [font-size:0.875rem] [text-align:left] [&_th]:[padding:16px_18px] [&_th]:[border-bottom:1px_solid_var(--ds-border-subtle)] [&_th]:[vertical-align:top] [&_td]:[padding:16px_18px] [&_td]:[border-bottom:1px_solid_var(--ds-border-subtle)] [&_td]:[vertical-align:top] [&_th]:[background:var(--ds-bg-soft)] [&_th]:[color:var(--ds-text-muted)] [&_th]:[font-size:0.75rem] [&_th]:[font-weight:600] [&_th]:[letter-spacing:normal] [&_th]:[text-transform:none] [&_tr:last-child_td]:[border-bottom:0] [&_tbody_tr]:[transition:background_var(--ds-duration-fast)_var(--ds-ease-out)] [&_tbody_tr:hover]:[background:var(--ds-bg-soft)] [&_.is-right]:[text-align:right]">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Farbe</th>
                        <th>Icon</th>
                        <th className="is-right">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category) => (
                        <tr key={category.id}>
                          <td>
                            <span className="ds-admin-table-title [color:var(--ds-text-strong)] [font-weight:600] [display:inline-flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-2)]">
                              {category.name}
                            </span>
                          </td>
                          <td>
                            <div className="ds-admin-color-value [display:inline-flex] [align-items:center] [gap:var(--ds-space-3)]">
                              <span
                                className="ds-admin-color-swatch [width:22px] [height:22px] [border:1px_solid_var(--ds-border-strong)] [border-radius:50%]"
                                style={{ backgroundColor: category.color }}
                                aria-hidden="true"
                              />
                              <span>{category.color}</span>
                            </div>
                          </td>
                          <td>{category.icon || '—'}</td>
                          <td className="is-right">
                            <div className="ds-admin-table-actions [display:inline-flex] [flex-wrap:wrap] [justify-content:flex-end] [gap:var(--ds-space-3)]">
                              <button
                                onClick={() => handleEditCategory(category.id)}
                                className="ds-admin-action-link [color:var(--ds-accent-strong)] [font-size:0.8125rem] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)] [&.is-danger]:[color:var(--ds-danger)] [&.is-muted]:[color:var(--ds-text-muted)] [&.is-disabled]:[color:var(--ds-text-muted)] [&.is-disabled]:[cursor:not-allowed] [&.is-disabled]:[opacity:0.6] [&.is-confirming]:[color:var(--ds-warning)]"
                              >
                                Bearbeiten
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(category.id)}
                                className={clsx(
                                  'ds-admin-action-link [color:var(--ds-accent-strong)] [font-size:0.8125rem] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)] [&.is-danger]:[color:var(--ds-danger)] [&.is-muted]:[color:var(--ds-text-muted)] [&.is-disabled]:[color:var(--ds-text-muted)] [&.is-disabled]:[cursor:not-allowed] [&.is-disabled]:[opacity:0.6] [&.is-confirming]:[color:var(--ds-warning)] is-danger',
                                  deleteConfirmation === category.id && 'is-confirming'
                                )}
                              >
                                {deleteConfirmation === category.id ? 'Bestätigen' : 'Löschen'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {categories.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="ds-admin-empty-row [color:var(--ds-text-muted)] [text-align:center]"
                          >
                            Noch keine Kategorien vorhanden.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div
                className="ds-admin-tab-panel [display:grid] [gap:var(--ds-space-4)]"
                role="tabpanel"
              >
                <div className="ds-admin-table-card [overflow-x:auto] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-xl)] [background:color-mix(in_srgb,_var(--ds-bg-elevated-strong)_76%,_transparent)] ">
                  <table className="ds-admin-table [width:100%] [min-width:760px] [border-collapse:collapse] [color:var(--ds-text-default)] [font-size:0.875rem] [text-align:left] [&_th]:[padding:16px_18px] [&_th]:[border-bottom:1px_solid_var(--ds-border-subtle)] [&_th]:[vertical-align:top] [&_td]:[padding:16px_18px] [&_td]:[border-bottom:1px_solid_var(--ds-border-subtle)] [&_td]:[vertical-align:top] [&_th]:[background:var(--ds-bg-soft)] [&_th]:[color:var(--ds-text-muted)] [&_th]:[font-size:0.75rem] [&_th]:[font-weight:600] [&_th]:[letter-spacing:normal] [&_th]:[text-transform:none] [&_tr:last-child_td]:[border-bottom:0] [&_tbody_tr]:[transition:background_var(--ds-duration-fast)_var(--ds-ease-out)] [&_tbody_tr:hover]:[background:var(--ds-bg-soft)] [&_.is-right]:[text-align:right]">
                    <thead>
                      <tr>
                        <th>Schlüssel</th>
                        <th>Wert</th>
                        <th>Beschreibung</th>
                        <th className="is-right">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settings.map((setting) => (
                        <tr key={setting.id}>
                          <td>
                            <span className="ds-admin-table-title [color:var(--ds-text-strong)] [font-weight:600] [display:inline-flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-2)]">
                              {setting.key}
                            </span>
                          </td>
                          <td>
                            {editingSetting?.id === setting.id ? (
                              <input
                                type="text"
                                value={newSettingValue}
                                onChange={(event) => setNewSettingValue(event.target.value)}
                                className="ds-input [width:100%] [height:48px] [padding-inline:14px] [border:1px_solid_var(--ds-border-default)] [border-radius:14px] [outline:none] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)] focus:[border-color:var(--ds-border-strong)] ds-admin-setting-input [min-width:240px]"
                              />
                            ) : (
                              <span>{setting.value}</span>
                            )}
                          </td>
                          <td>
                            <RichTextContent
                              value={setting.description}
                              emptyText="—"
                              className="rich-text-content-compact ds-admin-rich-text [color:var(--ds-text-default)]"
                            />
                          </td>
                          <td className="is-right">
                            {editingSetting?.id === setting.id ? (
                              <div className="ds-admin-table-actions [display:inline-flex] [flex-wrap:wrap] [justify-content:flex-end] [gap:var(--ds-space-3)]">
                                <button
                                  onClick={handleSaveSetting}
                                  className="ds-admin-action-link [color:var(--ds-accent-strong)] [font-size:0.8125rem] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)] [&.is-danger]:[color:var(--ds-danger)] [&.is-muted]:[color:var(--ds-text-muted)] [&.is-disabled]:[color:var(--ds-text-muted)] [&.is-disabled]:[cursor:not-allowed] [&.is-disabled]:[opacity:0.6] [&.is-confirming]:[color:var(--ds-warning)]"
                                >
                                  Speichern
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="ds-admin-action-link [color:var(--ds-accent-strong)] [font-size:0.8125rem] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)] [&.is-danger]:[color:var(--ds-danger)] [&.is-muted]:[color:var(--ds-text-muted)] [&.is-disabled]:[color:var(--ds-text-muted)] [&.is-disabled]:[cursor:not-allowed] [&.is-disabled]:[opacity:0.6] [&.is-confirming]:[color:var(--ds-warning)] is-muted"
                                >
                                  Abbrechen
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditSetting(setting)}
                                className="ds-admin-action-link [color:var(--ds-accent-strong)] [font-size:0.8125rem] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)] [&.is-danger]:[color:var(--ds-danger)] [&.is-muted]:[color:var(--ds-text-muted)] [&.is-disabled]:[color:var(--ds-text-muted)] [&.is-disabled]:[cursor:not-allowed] [&.is-disabled]:[opacity:0.6] [&.is-confirming]:[color:var(--ds-warning)]"
                              >
                                Bearbeiten
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {settings.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="ds-admin-empty-row [color:var(--ds-text-muted)] [text-align:center]"
                          >
                            Keine Einstellungen vorhanden. Legen Sie beispielsweise „roadmapTitle“
                            an, um den Titel der Instanz zu setzen.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </AdminShell>
  );
};

export default withAdminAuth(AdminPage);
