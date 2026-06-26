import clsx from 'clsx';
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
  getAdminSessionToken,
  getAdminUsername,
  getCurrentBrowserInstanceSlug,
  hasValidAdminSession,
  logout,
} from '@/utils/auth';
import { normalizeCategoryId, resolveCategoryName, UNCATEGORIZED_ID } from '@/utils/categoryUtils';
import { INSTANCE_QUERY_PARAM } from '@/utils/instanceConfig';

type AdminTab = 'projects' | 'categories' | 'settings';

const STATUS_LABELS: Record<string, string> = {
  completed: 'Abgeschlossen',
  'in-progress': 'In Umsetzung',
  planned: 'Geplant',
  paused: 'Pausiert',
  cancelled: 'Gestoppt',
};

const STATUS_STYLES: Record<string, string> = {
  completed: 'ds-admin-status-completed',
  'in-progress': 'ds-admin-status-active',
  planned: 'ds-admin-status-planned',
  paused: 'ds-admin-status-paused',
  cancelled: 'ds-admin-status-cancelled',
};

const AdminShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <Head>
      <title>Admin | JSDoIT Roadmap</title>
    </Head>

    <div className="ds-page-shell">
      <SiteHeader activeRoute="admin" />
      {children}
      <footer className="ds-footer">
        <div className="ds-container ds-footer-inner">
          <span>JSDoIT Roadmap Center</span>
          <div className="ds-footer-links">
            <Link className="ds-footer-link" href="/instances">
              Instanzen
            </Link>
            <Link className="ds-footer-link" href="/help/admin">
              Admin-Handbuch
            </Link>
            <Link className="ds-footer-link" href="/roadmap">
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
  const fetchRequestIdRef = useRef(0);
  const effectiveInstanceSlug = instanceSlug || getCurrentBrowserInstanceSlug() || '';

  const buildApiUrl = useCallback(
    (path: string) => {
      if (!instanceSlug) return path;
      const separator = path.includes('?') ? '&' : '?';
      return `${path}${separator}${INSTANCE_QUERY_PARAM}=${encodeURIComponent(instanceSlug)}`;
    },
    [instanceSlug]
  );

  const getAuthHeaders = () => {
    const token = getAdminSessionToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
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
        <main className="ds-page-main ds-admin-state-main">
          <section className="ds-container ds-centered-state">
            <div className="ds-card ds-admin-state-card">
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
        <main className="ds-page-main ds-admin-state-main">
          <section className="ds-container ds-centered-state">
            <div className="ds-card ds-admin-state-card is-danger">
              <h1>Es ist ein Fehler aufgetreten</h1>
              <p>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="ds-button ds-button-primary"
              >
                <FiRefreshCw className="ds-icon-sm" />
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
      <main className="ds-page-main ds-admin-page-main">
        <div className="ds-container ds-admin-dashboard">
          <header className="ds-card ds-admin-hero">
            <div className="ds-admin-hero-content">
              <div className="ds-eyebrow">
                <FiShield className="ds-icon-sm" />
                Administration
              </div>
              <h1 className="ds-admin-title">Roadmap Admin-Dashboard</h1>
              <p className="ds-admin-copy">
                Verwalten Sie Projekte, Kategorien und Instanz-Einstellungen an einem Ort.
                Änderungen werden sofort in der Roadmap sichtbar. Transparente Pflege sorgt für
                Vertrauen bei allen Stakeholdern.
              </p>

              {adminUsername && (
                <p className="ds-admin-user">
                  Angemeldet als <span>{adminUsername}</span>
                </p>
              )}
            </div>

            <div className="ds-admin-hero-actions">
              <Link href="/help/admin" className="ds-button ds-button-primary">
                <FiBookOpen className="ds-icon-sm" />
                Admin-Handbuch
              </Link>
              <Link href={roadmapHref} className="ds-button ds-button-secondary">
                <FiExternalLink className="ds-icon-sm" />
                Zur Roadmap
              </Link>
              <button
                onClick={handleLogout}
                className="ds-button ds-button-secondary ds-button-danger"
              >
                <FiLogOut className="ds-icon-sm" />
                Abmelden
              </button>
            </div>
          </header>

          <section className="ds-admin-stat-grid">
            {stats.map((stat) => (
              <article key={stat.label} className="ds-card ds-admin-stat-card">
                <p className="ds-admin-stat-label">{stat.label}</p>
                <p className="ds-admin-stat-value">{stat.value}</p>
              </article>
            ))}
          </section>

          <section className="ds-card ds-admin-access-panel">
            <div className="ds-admin-access-header">
              <div>
                <p className="ds-panel-label">Instanz-Admins</p>
                <h2 className="ds-panel-title">Adminrechte für diese Instanz vergeben</h2>
                <p className="ds-admin-section-copy">
                  Benutzer mit Abteilungszugriff sehen die Roadmap nur lesend. Adminrechte entstehen
                  ausschließlich über diese Liste, konfigurierte Admin-Gruppen oder
                  Superadminrechte.
                </p>
                <p className="ds-admin-instance-label">
                  Aktive Instanz: {effectiveInstanceSlug || 'nicht ausgewählt'}
                </p>
              </div>

              <div className="ds-admin-user-picker">
                <SharePointUserPicker
                  instanceSlug={effectiveInstanceSlug || null}
                  disabled={instanceAdminSaving || !effectiveInstanceSlug}
                  placeholder="Benutzer als Instanz-Admin suchen …"
                  onSelect={(user) => void addInstanceAdmin(user.value)}
                  emptyMessage="Keine passenden SharePoint-Benutzer gefunden."
                />
                {instanceAdminError ? (
                  <div className="ds-message ds-message-danger ds-admin-inline-message">
                    {instanceAdminError}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="ds-admin-user-list">
              {instanceAdminLoading ? (
                <p className="ds-admin-muted">Lade Instanz-Admins …</p>
              ) : instanceAdminUsers.length === 0 ? (
                <p className="ds-admin-muted">Noch keine zusätzlichen Instanz-Admins gepflegt.</p>
              ) : (
                instanceAdminUsers.map((username) => (
                  <div key={username} className="ds-admin-user-row">
                    <div>
                      <div className="ds-admin-row-title">{username}</div>
                      <div className="ds-admin-row-copy">
                        Darf diese Instanz administrieren, auch ohne Superadminrolle.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeInstanceAdmin(username)}
                      disabled={instanceAdminSaving}
                      className={clsx(
                        'ds-admin-action-link is-danger',
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

          <section className="ds-admin-tab-section">
            <div className="ds-admin-tabs" role="tablist" aria-label="Adminbereiche">
              {(['projects', 'categories', 'settings'] as AdminTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx('ds-admin-tab', activeTab === tab && 'is-active')}
                >
                  {tab === 'projects' && 'Projekte'}
                  {tab === 'categories' && 'Kategorien'}
                  {tab === 'settings' && 'Einstellungen'}
                </button>
              ))}
            </div>

            {activeTab === 'projects' && (
              <div className="ds-admin-tab-panel" role="tabpanel">
                <div className="ds-admin-panel-actions">
                  <button onClick={handleAddProject} className="ds-button ds-button-primary">
                    <FiPlus className="ds-icon-sm" />
                    Neues Projekt
                  </button>
                </div>

                <div className="ds-admin-table-card">
                  <table className="ds-admin-table">
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
                            <div className="ds-admin-table-title">
                              {project.title || '(Ohne Titel)'}
                              {project.isReadOnlyMirror && (
                                <span className="ds-admin-mirror-badge">Read-only Spiegelung</span>
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
                                'ds-admin-status',
                                getStatusBadgeClass(project.status)
                              )}
                            >
                              {getStatusLabel(project.status)}
                            </span>
                          </td>
                          <td className="is-right">
                            {project.isReadOnlyMirror ? (
                              <span className="ds-admin-muted">Nur lesen</span>
                            ) : (
                              <div className="ds-admin-table-actions">
                                <button
                                  onClick={() => handleEditProject(project.id)}
                                  className="ds-admin-action-link"
                                >
                                  Bearbeiten
                                </button>
                                <button
                                  onClick={() => handleDeleteProject(project.id)}
                                  className="ds-admin-action-link is-danger"
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
                          <td colSpan={5} className="ds-admin-empty-row">
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
              <div className="ds-admin-tab-panel" role="tabpanel">
                <div className="ds-admin-panel-actions">
                  <button onClick={handleAddCategory} className="ds-button ds-button-primary">
                    <FiPlus className="ds-icon-sm" />
                    Neue Kategorie
                  </button>
                </div>

                <div className="ds-admin-table-card">
                  <table className="ds-admin-table">
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
                            <span className="ds-admin-table-title">{category.name}</span>
                          </td>
                          <td>
                            <div className="ds-admin-color-value">
                              <span
                                className="ds-admin-color-swatch"
                                style={{ backgroundColor: category.color }}
                                aria-hidden="true"
                              />
                              <span>{category.color}</span>
                            </div>
                          </td>
                          <td>{category.icon || '—'}</td>
                          <td className="is-right">
                            <div className="ds-admin-table-actions">
                              <button
                                onClick={() => handleEditCategory(category.id)}
                                className="ds-admin-action-link"
                              >
                                Bearbeiten
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(category.id)}
                                className={clsx(
                                  'ds-admin-action-link is-danger',
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
                          <td colSpan={4} className="ds-admin-empty-row">
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
              <div className="ds-admin-tab-panel" role="tabpanel">
                <div className="ds-admin-table-card">
                  <table className="ds-admin-table">
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
                            <span className="ds-admin-table-title">{setting.key}</span>
                          </td>
                          <td>
                            {editingSetting?.id === setting.id ? (
                              <input
                                type="text"
                                value={newSettingValue}
                                onChange={(event) => setNewSettingValue(event.target.value)}
                                className="ds-input ds-admin-setting-input"
                              />
                            ) : (
                              <span>{setting.value}</span>
                            )}
                          </td>
                          <td>
                            <RichTextContent
                              value={setting.description}
                              emptyText="—"
                              className="rich-text-content-compact ds-admin-rich-text"
                            />
                          </td>
                          <td className="is-right">
                            {editingSetting?.id === setting.id ? (
                              <div className="ds-admin-table-actions">
                                <button
                                  onClick={handleSaveSetting}
                                  className="ds-admin-action-link"
                                >
                                  Speichern
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="ds-admin-action-link is-muted"
                                >
                                  Abbrechen
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditSetting(setting)}
                                className="ds-admin-action-link"
                              >
                                Bearbeiten
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {settings.length === 0 && (
                        <tr>
                          <td colSpan={4} className="ds-admin-empty-row">
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
