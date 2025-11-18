import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { clientDataService } from '@/utils/clientDataService';
import { hasAdminAccess } from '@/utils/auth';
import withAdminAuth from '@/components/withAdminAuth';
import { AppSettings, Category, Project } from '@/types';
import { normalizeCategoryId, resolveCategoryName, UNCATEGORIZED_ID } from '@/utils/categoryUtils';



const AdminPage: React.FC = () => {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AppSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'categories' | 'fieldTypes' | 'settings'>('projects');
  const [editingSetting, setEditingSetting] = useState<AppSettings | null>(null);
  const [newSettingValue, setNewSettingValue] = useState<string>('');

  // Fetch projects, categories, and field types
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch projects
        const projectsData = await clientDataService.getAllProjects();

        // Fetch categories
        const categoriesData = await clientDataService.getAllCategories();

        const settingsData = await clientDataService.getAppSettings();
        setSettings(settingsData);
        const normalizedProjects = Array.isArray(projectsData)
          ? projectsData.map(project => ({
              ...project,
              category: normalizeCategoryId(project.category, categoriesData)
            }))
          : projectsData;
        setProjects(normalizedProjects);
        setCategories(categoriesData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // Check admin access with the server
        const hasAccess = await hasAdminAccess();

        if (!hasAccess) {
          setError('Sie haben keine Admin-Berechtigung. Bitte kontaktieren Sie Ihren Administrator.');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking admin access:', error);
        setError('Fehler beim Überprüfen der Admin-Berechtigung');
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  // Re-normalize project categories whenever the category list updates (e.g., after edits)
  useEffect(() => {
    if (!categories.length) return;
    setProjects(prevProjects =>
      prevProjects.map(project => ({
        ...project,
        category: normalizeCategoryId(project.category, categories)
      }))
    );
  }, [categories]);

  // Project management functions
  const handleAddProject = () => {
    router.push('/admin/projects/new');
  };

  const handleEditProject = (projectId: string) => {
    router.push(`/admin/projects/edit/${projectId}`);
  };

  const handleDeleteProject = async (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await clientDataService.deleteProject(id);

        // Remove the deleted project from the state
        setProjects(projects.filter(project => project.id !== id));
      } catch (error) {
        console.error('Error deleting project:', error);
        setError('Failed to delete project');
      }
    }
  };

  // Category management functions
  const handleAddCategory = () => {
    router.push('/admin/categories/new');
  };

  const handleEditCategory = (categoryId: string) => {
    router.push(`/admin/categories/edit/${categoryId}`);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (deleteConfirmation !== categoryId) {
      // First click - show confirmation
      setDeleteConfirmation(categoryId);
      return;
    }

    // Second click - proceed with deletion
    try {
      // Use clientDataService directly instead of fetch API
      await clientDataService.deleteCategory(categoryId);

      // Remove the category from the state
      setCategories(categories.filter(category => category.id !== categoryId));
      setDeleteConfirmation(null);
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Failed to delete category');
    }
  };

  const getCategoryName = (categoryValue: string) => {
    const normalizedId = normalizeCategoryId(categoryValue, categories);
    if (normalizedId === UNCATEGORIZED_ID) {
      return 'Unkategorisiert';
    }

    const byId = categories.find(cat => cat.id === normalizedId);
    if (byId) {
      return byId.name;
    }

    if (!categoryValue) {
      return 'Unkategorisiert';
    }

    const fallback = resolveCategoryName(categoryValue, categories, {
      emptyLabel: 'Unkategorisiert',
      unknownLabel: categoryValue,
      preferRawFallback: true
    });

    if (fallback && fallback.trim()) {
      return fallback;
    }

    return categoryValue || 'Unknown';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'planned': return 'bg-gray-500';
      case 'paused': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatus = (status: string) => {
    switch (status) {
      case 'completed': return 'Abgeschlossen';
      case 'in-progress': return 'In Bearbeitung';
      case 'planned': return 'Geplant';
      case 'paused': return 'Pausiert';
      case 'cancelled': return 'Abgebrochen';
      default: return 'Unbekannt';
    }
  };

  const handleEditSetting = (setting: AppSettings) => {
    setEditingSetting(setting);
    setNewSettingValue(setting.value);
  };

  const handleSaveSetting = async () => {
    if (!editingSetting) return;

    try {
      const updatedSetting = {
        ...editingSetting,
        value: newSettingValue
      };

      const result = await clientDataService.updateSetting(updatedSetting);

      // Update the settings in state
      setSettings(settings.map((s: AppSettings) => s.id === result.id ? result : s));
      setEditingSetting(null);
      setNewSettingValue('');
    } catch (error) {
      console.error('Error updating setting:', error);
      alert('Failed to update setting');
    }
  };
  const handleCancelEdit = () => {
    setEditingSetting(null);
    setNewSettingValue('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center justify-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  const handleLogout = () => {
    if (confirm('Möchten Sie sich wirklich abmelden?')) {
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminUsername');
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            {sessionStorage.getItem('adminUsername') && (
              <p className="text-sm text-gray-400 mt-1">
                Angemeldet als: {sessionStorage.getItem('adminUsername')}
              </p>
            )}
          </div>
          <div className="flex space-x-4">
            <Link href="/help/admin">
              <button className="bg-blue-700 hover:bg-blue-600 text-white py-2 px-4 rounded">
                Admin Hilfe
              </button>
            </Link>
            <Link href="/">
              <button className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded">
                Zurück zu Roadmap
              </button>
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-700 hover:bg-red-600 text-white py-2 px-4 rounded"
            >
              Abmelden
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-6">
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'projects'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
              }`}
            onClick={() => setActiveTab('projects')}
          >
            Projekte
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'categories'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
              }`}
            onClick={() => setActiveTab('categories')}
          >
            Kategorien
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'settings'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
              }`}
            onClick={() => setActiveTab('settings')}
          >
            Einstellungen
          </button>
        </div>

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={handleAddProject}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
              >
                Neues Projekt
              </button>
            </div>

            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Titel</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Kategorie</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Timeline</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {projects.map(project => (
                    <tr key={project.id} className="hover:bg-gray-750">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{project.title || '(Ohne Titel)'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{getCategoryName(project.category)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{project.startQuarter} - {project.endQuarter}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(project.status)} text-white`}>
                          {getStatus(project.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditProject(project.id)}
                          className="text-blue-400 hover:text-blue-300 mr-4"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className={`${deleteConfirmation === project.id ? 'text-red-500' : 'text-red-400'} hover:text-red-300`}
                        >
                          {deleteConfirmation === project.id ? 'Bestätigen' : 'Löschen'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={handleAddCategory}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
              >
                Neue Kategorie
              </button>
            </div>

            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Farbe</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Icon</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {categories.map(category => (
                    <tr key={category.id} className="hover:bg-gray-750">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{category.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className="w-6 h-6 rounded mr-2"
                            style={{ backgroundColor: category.color }}
                          ></div>
                          <span className="text-sm text-gray-300">{category.color}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{category.icon}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditCategory(category.id)}
                          className="text-blue-400 hover:text-blue-300 mr-4"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className={`${deleteConfirmation === category.id ? 'text-red-500' : 'text-red-400'} hover:text-red-300`}
                        >
                          {deleteConfirmation === category.id ? 'Bestätigen' : 'Löschen'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'settings' && (
          <>
            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Schlüssel</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Wert</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Beschreibung</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {settings.map((setting: AppSettings) => (
                    <tr key={setting.id} className="hover:bg-gray-750">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{setting.key}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingSetting && editingSetting.id === setting.id ? (
                          <input
                            type="text"
                            value={newSettingValue}
                            onChange={(e) => setNewSettingValue(e.target.value)}
                            className="bg-gray-700 text-white px-2 py-1 rounded w-full"
                          />
                        ) : (
                          <div className="text-sm text-gray-300">{setting.value}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{setting.description || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingSetting && editingSetting.id === setting.id ? (
                          <>
                            <button
                              onClick={handleSaveSetting}
                              className="text-green-400 hover:text-green-300 mr-4"
                            >
                              Speichern
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-gray-400 hover:text-gray-300"
                            >
                              Abbrechen
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleEditSetting(setting)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Bearbeiten
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {settings.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-400">
                        Keine Einstellungen gefunden. Erstellen Sie die Einstellung &quot;roadmapTitle&quot; für den Roadmap-Titel.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default withAdminAuth(AdminPage);