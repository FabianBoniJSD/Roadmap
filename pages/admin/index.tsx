import clsx from 'clsx';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import JSDoITLoader from '@/components/JSDoITLoader';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import withAdminAuth from '@/components/withAdminAuth';
import { AppSettings, Category, Project } from '@/types';
import { clientDataService } from '@/utils/clientDataService';
import { getAdminUsername, hasAdminAccess, logout } from '@/utils/auth';
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
  completed: 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
  'in-progress': 'border border-sky-500/40 bg-sky-500/15 text-sky-200',
  planned: 'border border-slate-500/40 bg-slate-500/20 text-slate-200',
  paused: 'border border-amber-500/40 bg-amber-500/15 text-amber-200',
  cancelled: 'border border-rose-500/40 bg-rose-500/15 text-rose-200',
};

const AdminShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
    <SiteHeader activeRoute="admin" />
    {children}
    <SiteFooter />
  </div>
);

const AdminPage: React.FC = () => {
  const router = useRouter();
  const instanceSlug = useMemo(() => {
    const raw = router.query?.[INSTANCE_QUERY_PARAM];
    return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
  }, [router.query]);
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [projectData, categoryData, settingsData] = await Promise.all([
          clientDataService.getAllProjects(),
          clientDataService.getAllCategories(),
          clientDataService.getAppSettings(),
        ]);

        const normalizedProjects = Array.isArray(projectData)
          ? projectData.map((project) => ({
              ...project,
              category: normalizeCategoryId(project.category, categoryData),
            }))
          : projectData;

        setProjects(normalizedProjects);
        setCategories(categoryData);
        setSettings(settingsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Die Daten konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refetch whenever the active instance changes so we do not keep stale data
  }, [instanceSlug]);

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const hasAccess = await hasAdminAccess();
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

  useEffect(() => {
    if (!categories.length) return;
    setProjects((prev) =>
      prev.map((project) => ({
        ...project,
        category: normalizeCategoryId(project.category, categories),
      }))
    );
  }, [categories]);

  const handleAddProject = () => router.push('/admin/projects/new');
  const handleEditProject = (projectId: string) => router.push(`/admin/projects/edit/${projectId}`);

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('Möchten Sie dieses Projekt wirklich löschen?')) return;
    try {
      await clientDataService.deleteProject(id);
      setProjects((prev) => prev.filter((project) => project.id !== id));
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Projekt konnte nicht gelöscht werden.');
    }
  };

  const handleAddCategory = () => router.push('/admin/categories/new');
  const handleEditCategory = (categoryId: string) =>
    router.push(`/admin/categories/edit/${categoryId}`);

  const handleDeleteCategory = async (categoryId: string) => {
    if (deleteConfirmation !== categoryId) {
      setDeleteConfirmation(categoryId);
      return;
    }

    try {
      await clientDataService.deleteCategory(categoryId);
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

      const saved = await clientDataService.updateSetting(updatedSetting);
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
        <main className="flex flex-1 items-center justify-center pt-12">
          <JSDoITLoader sizeRem={2.8} message="Adminbereich wird geladen …" />
        </main>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell>
        <main className="flex flex-1 items-center justify-center px-6 pt-12">
          <div className="max-w-md space-y-5 rounded-3xl border border-red-500/40 bg-red-500/10 p-8 text-center">
            <h1 className="text-xl font-semibold text-white">Es ist ein Fehler aufgetreten</h1>
            <p className="text-sm text-red-200">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              Erneut versuchen
            </button>
          </div>
        </main>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <main className="flex-1 pt-12">
        <div className="mx-auto w-full max-w-6xl space-y-10 px-6 pb-16">
          <header className="rounded-3xl border border-slate-800/70 bg-slate-950/70 px-8 py-9 shadow-xl shadow-slate-950/40">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300/80">
                  Administration
                </p>
                <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
                  Roadmap Admin-Dashboard
                </h1>
                <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
                  Verwalten Sie Projekte, Kategorien und Instanz-Einstellungen an einem Ort.
                  Änderungen werden sofort in der Roadmap sichtbar. Denken Sie daran: Transparente
                  Pflege sorgt für Vertrauen bei allen Stakeholdern.
                </p>
                {adminUsername && (
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Angemeldet als <span className="text-slate-100">{adminUsername}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3 text-sm">
                <Link
                  href="/help/admin"
                  className="rounded-full border border-sky-500/60 px-4 py-2 text-center font-semibold text-sky-200 transition hover:border-sky-400 hover:text-white"
                >
                  Admin-Handbuch
                </Link>
                <Link
                  href="/"
                  className="rounded-full border border-slate-700 px-4 py-2 text-center font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
                >
                  Zur Roadmap
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-full border border-rose-500/70 px-4 py-2 text-center font-semibold text-rose-200 transition hover:border-rose-400 hover:text-rose-100"
                >
                  Abmelden
                </button>
              </div>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-3xl border border-slate-800/70 bg-slate-950/70 px-6 py-5 text-center shadow-lg shadow-slate-950/30"
              >
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{stat.value}</p>
              </div>
            ))}
          </section>

          <section className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              {(['projects', 'categories', 'settings'] as AdminTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'rounded-full border px-4 py-2 text-sm font-semibold transition',
                    activeTab === tab
                      ? 'border-sky-400 bg-sky-500/10 text-sky-100 shadow-inner shadow-sky-900/40'
                      : 'border-slate-700 text-slate-300 hover:border-sky-400 hover:text-white'
                  )}
                >
                  {tab === 'projects' && 'Projekte'}
                  {tab === 'categories' && 'Kategorien'}
                  {tab === 'settings' && 'Einstellungen'}
                </button>
              ))}
            </div>

            {activeTab === 'projects' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={handleAddProject}
                    className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
                  >
                    Neues Projekt
                  </button>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-950/60">
                  <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                    <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.25em] text-slate-400">
                      <tr>
                        <th className="px-6 py-3">Titel</th>
                        <th className="px-6 py-3">Kategorie</th>
                        <th className="px-6 py-3">Zeitraum</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
                      {projects.map((project) => (
                        <tr key={project.id} className="transition hover:bg-slate-900/80">
                          <td className="px-6 py-4">
                            <div className="font-medium text-white">
                              {project.title || '(Ohne Titel)'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-300">
                              {getCategoryName(project.category)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-300">
                              {project.startQuarter || project.startDate || '—'} –{' '}
                              {project.endQuarter || project.endDate || '—'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={clsx(
                                'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em]',
                                getStatusBadgeClass(project.status)
                              )}
                            >
                              {getStatusLabel(project.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditProject(project.id)}
                              className="text-sky-300 transition hover:text-sky-200"
                            >
                              Bearbeiten
                            </button>
                            <span className="mx-2 text-slate-600">|</span>
                            <button
                              onClick={() => handleDeleteProject(project.id)}
                              className="text-rose-300 transition hover:text-rose-200"
                            >
                              Löschen
                            </button>
                          </td>
                        </tr>
                      ))}
                      {projects.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-6 text-center text-sm text-slate-400">
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
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={handleAddCategory}
                    className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
                  >
                    Neue Kategorie
                  </button>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-950/60">
                  <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                    <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.25em] text-slate-400">
                      <tr>
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Farbe</th>
                        <th className="px-6 py-3">Icon</th>
                        <th className="px-6 py-3 text-right">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
                      {categories.map((category) => (
                        <tr key={category.id} className="transition hover:bg-slate-900/80">
                          <td className="px-6 py-4 font-medium text-white">{category.name}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span
                                className="h-5 w-5 rounded-full border border-white/20"
                                style={{ backgroundColor: category.color }}
                                aria-hidden="true"
                              />
                              <span className="text-slate-300">{category.color}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-300">{category.icon || '—'}</td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditCategory(category.id)}
                              className="text-sky-300 transition hover:text-sky-200"
                            >
                              Bearbeiten
                            </button>
                            <span className="mx-2 text-slate-600">|</span>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className={clsx(
                                'transition',
                                deleteConfirmation === category.id
                                  ? 'text-rose-400 hover:text-rose-300'
                                  : 'text-rose-300 hover:text-rose-200'
                              )}
                            >
                              {deleteConfirmation === category.id ? 'Bestätigen' : 'Löschen'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {categories.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-6 text-center text-sm text-slate-400">
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
              <div className="overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-950/60">
                <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.25em] text-slate-400">
                    <tr>
                      <th className="px-6 py-3">Schlüssel</th>
                      <th className="px-6 py-3">Wert</th>
                      <th className="px-6 py-3">Beschreibung</th>
                      <th className="px-6 py-3 text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
                    {settings.map((setting) => (
                      <tr key={setting.id} className="transition hover:bg-slate-900/80">
                        <td className="px-6 py-4 font-medium text-white">{setting.key}</td>
                        <td className="px-6 py-4">
                          {editingSetting?.id === setting.id ? (
                            <input
                              type="text"
                              value={newSettingValue}
                              onChange={(event) => setNewSettingValue(event.target.value)}
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                            />
                          ) : (
                            <span className="text-slate-300">{setting.value}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-300">{setting.description || '—'}</td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          {editingSetting?.id === setting.id ? (
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={handleSaveSetting}
                                className="text-sky-300 transition hover:text-sky-200"
                              >
                                Speichern
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-slate-400 transition hover:text-slate-200"
                              >
                                Abbrechen
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditSetting(setting)}
                              className="text-sky-300 transition hover:text-sky-200"
                            >
                              Bearbeiten
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {settings.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-6 text-center text-sm text-slate-400">
                          Keine Einstellungen vorhanden. Legen Sie beispielsweise „roadmapTitle“ an,
                          um den Titel der Instanz zu setzen.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </AdminShell>
  );
};

export default withAdminAuth(AdminPage);
