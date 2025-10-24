// In pages/admin/projects/edit/[id].tsx
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProjectForm from '../../../../components/ProjectForm';
import withAdminAuth from '@/components/withAdminAuth';
import { clientDataService } from '@/utils/clientDataService';
import { Project, Category, TeamMember } from '@/types';
import { resolveSharePointSiteUrl } from '@/utils/sharepointEnv';


const EditProjectPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState<Array<{ FileName: string; ServerRelativeUrl: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [currentFileName, setCurrentFileName] = useState('');
  const uploadAbortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sharePointBaseUrl = resolveSharePointSiteUrl().replace(/\/$/, '');
  const buildSharePointAttachmentUrl = (serverRelativeUrl: string) => {
    if (!serverRelativeUrl) return '#';
    try {
      return new URL(serverRelativeUrl, `${sharePointBaseUrl}/`).toString();
    } catch {
      const normalized = serverRelativeUrl.startsWith('/') ? serverRelativeUrl : `/${serverRelativeUrl}`;
      return `${sharePointBaseUrl}${encodeURI(normalized)}`;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (id && typeof id === 'string') {
        setLoading(true);
        try {
          const [projectData, categoriesData, teamMembersData, attachmentsData] = await Promise.all([
            clientDataService.getProjectById(id),
            clientDataService.getAllCategories(),
            clientDataService.getTeamMembersForProject(id),
            clientDataService.listAttachments(id)
          ]);

          setProject(projectData);
          setCategories(categoriesData);
          setTeamMembers(teamMembersData);
          setAttachments(attachmentsData);
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [id]);

  const handleCancel = () => {
    router.push('/admin');
  };

  const refreshAttachments = async () => {
    if (!id || typeof id !== 'string') return;
    const list = await clientDataService.listAttachments(id);
    setAttachments(list);
  };

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const projectId = project?.id || (typeof id === 'string' ? id : null);
    if (!projectId) return;
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    setUploadError('');
    setUploading(true);

    try {
      for (const file of files) {
        setCurrentFileName(file.name);
        setUploadPct(0);
        const controller = new AbortController();
        uploadAbortRef.current = controller;
        const result = await clientDataService.uploadAttachment(projectId, file, {
          onProgress: (pct) => setUploadPct(pct),
          signal: controller.signal
        });
        if (result.ok) {
          await refreshAttachments();
        } else if (result.aborted) {
          setUploadError('Upload abgebrochen');
          break;
        } else {
          setUploadError(result.error || 'Upload fehlgeschlagen');
        }
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload fehlgeschlagen');
    } finally {
      uploadAbortRef.current = null;
      setCurrentFileName('');
      setUploadPct(0);
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAbortUpload = () => {
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort();
    }
  };

  const handleDeleteAttachment = async (fileName: string) => {
    const projectId = project?.id || (typeof id === 'string' ? id : null);
    if (!projectId) return;
    setUploadError('');
    const ok = await clientDataService.deleteAttachment(projectId, fileName);
    if (ok) {
      setAttachments(prev => prev.filter(item => item.FileName !== fileName));
    } else {
      setUploadError('Löschen fehlgeschlagen');
    }
  };

  const handleSubmit = async (updatedProject: Project) => {
    try {
      // Create a clean object with only primitive values for SharePoint
      const projectToSave = {
        id: updatedProject.id,
        title: updatedProject.title || '',
        category: updatedProject.category || '',
        startQuarter: updatedProject.startQuarter || '',
        endQuarter: updatedProject.endQuarter || '',
        description: updatedProject.description || '',
        status: updatedProject.status || 'planned',
        projektleitung: updatedProject.projektleitung || '',
        bisher: updatedProject.bisher || '',
        zukunft: updatedProject.zukunft || '',
        fortschritt: typeof updatedProject.fortschritt === 'number' ? updatedProject.fortschritt : 0,
        geplante_umsetzung: updatedProject.geplante_umsetzung || '',
        budget: updatedProject.budget || '',
        startDate: '',
        endDate: '',
            projektphase: updatedProject.projektphase || '',
            naechster_meilenstein: updatedProject.naechster_meilenstein || '',
        // Make sure ProjectFields is an array to match the Project type
        ProjectFields: [] as string[]
      };

      // Format date fields correctly for SharePoint
      if (updatedProject.startDate) {
        try {
          const startDate = new Date(updatedProject.startDate);
          if (!isNaN(startDate.getTime())) {
            projectToSave.startDate = startDate.toISOString().split('T')[0] + 'T00:00:00Z';
          }
        } catch (e) {
          console.error('Fehler beim Formatieren des Startdatums:', e);
        }
      }

      if (updatedProject.endDate) {
        try {
          const endDate = new Date(updatedProject.endDate);
          if (!isNaN(endDate.getTime())) {
            projectToSave.endDate = endDate.toISOString().split('T')[0] + 'T00:00:00Z';
          }
        } catch (e) {
          console.error('Fehler beim Formatieren des Enddatums:', e);
        }
      }

      // Handle ProjectFields - ensure it's an array of strings
      if (updatedProject.ProjectFields) {
        if (Array.isArray(updatedProject.ProjectFields)) {
          // Keep the array as is, but ensure all elements are strings
          projectToSave.ProjectFields = updatedProject.ProjectFields.map(field => String(field));
        } else if (typeof updatedProject.ProjectFields === 'string') {
          // Split by semicolons or commas, but only if it contains those characters
          const fieldString = updatedProject.ProjectFields as string;
          if (fieldString.includes(';') || fieldString.includes(',')) {
            projectToSave.ProjectFields = fieldString
              .split(/[;,]/)
              .map(item => item.trim())
              .filter(Boolean);
          } else {
            // If it's a single value without delimiters, treat it as a single field
            projectToSave.ProjectFields = [fieldString];
          }
        } else {
          projectToSave.ProjectFields = [String(updatedProject.ProjectFields)];
        }
      }

      // Extract team members from updatedProject
      const teamMembersToSave = updatedProject.teamMembers
        ? (Array.isArray(updatedProject.teamMembers)
          ? updatedProject.teamMembers.map(member =>
            typeof member === 'string'
              ? { name: member, role: 'Teammitglied' }
              : { name: member.name, role: member.role || 'Teammitglied' }
          )
          : [])
        : [];

      console.log('Projekt vor dem Speichern:', projectToSave);
      console.log('Team members to save:', teamMembersToSave);

      // Save the basic project data
      const savedProject = await clientDataService.updateProject(projectToSave.id, projectToSave as Partial<Project>);
      console.log('Gespeichertes Projekt:', savedProject);

      // Process team members
      if (teamMembersToSave.length > 0) {
        try {
          // Delete existing team members
          await clientDataService.deleteTeamMembersForProject(savedProject.id);
          console.log('Existing team members deleted');

          // Add new team members
          for (const member of teamMembersToSave) {
            const memberName = member.name;
            const memberRole = member.role || 'Teammitglied';

            if (memberName) {
              console.log(`Creating team member: ${memberName} with role ${memberRole}`);
              await clientDataService.createTeamMember({
                name: memberName,
                role: memberRole,
                projectId: savedProject.id
              });
            }
          }
          console.log('New team members created');
        } catch (error) {
          console.error('Error updating team members:', error);
        }
      } else {
        // If no team members provided, still delete any existing ones
        try {
          await clientDataService.deleteTeamMembersForProject(savedProject.id);
          console.log('Existing team members deleted (no new members to add)');
        } catch (error) {
          console.error('Error deleting team members:', error);
        }
      }

      // Process links if they exist
      if (updatedProject.links && Array.isArray(updatedProject.links) && updatedProject.links.length > 0) {
        try {
          // Delete existing links
          await clientDataService.deleteProjectLinks(savedProject.id);
          console.log('Existing project links deleted');

          // Add new links
          for (const link of updatedProject.links) {
            if (typeof link === 'object' && link.title && link.url) {
              console.log(`Creating link: ${link.title} with URL ${link.url}`);

              // Ensure projectId is set correctly as a string
              await clientDataService.createProjectLink({
                title: link.title,
                url: link.url,
                projectId: savedProject.id
              });
            }
          }
          console.log('New project links created');
        } catch (error) {
          console.error('Error updating links:', error);
          // Continue with save process even if links fail
        }
      }

      // Navigate back to admin page
      router.push('/admin');
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Fehler beim Speichern des Projekts: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 py-4 px-6 border-b border-gray-700">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Projekt bearbeiten</h1>
          <Link href="/admin">
            <button className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors">
              Zurück zum Dashboard
            </button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-gray-800 rounded-lg shadow p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-xl">Loading...</div>
            </div>
          ) : id && typeof id === 'string' && project ? (
            <>
              <ProjectForm
                initialProject={{
                  ...project,
                  teamMembers: teamMembers.map(member => ({
                    name: member.name,
                    role: member.role,
                    projectId: member.projectId,
                    id: member.id
                  }))
                }}
                categories={categories}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
              />

              <div className="mt-8">
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h2 className="text-xl font-bold mb-4 pb-3 border-b border-gray-700 text-white">Anhänge verwalten</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    Laden Sie Dateien hoch oder entfernen Sie bestehende Anhänge. Unterstützte Formate: PDF, Office-Dokumente, Bilder, Text, ZIP (max. 25 MB pro Datei).
                  </p>
                  <div className="space-y-3">
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelection}
                        disabled={uploading}
                        className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600 disabled:opacity-60"
                      />
                      {uploading && (
                        <div className="mt-2">
                          <div className="h-2 bg-gray-700 rounded overflow-hidden">
                            <div className="h-full bg-blue-600" style={{ width: `${uploadPct}%` }} />
                          </div>
                          <div className="flex items-center justify-between mt-2 text-sm text-gray-300">
                            <span className="truncate mr-2">{currentFileName}</span>
                            <button
                              type="button"
                              className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 border border-gray-600"
                              onClick={handleAbortUpload}
                            >
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      )}
                      {!uploading && currentFileName && (
                        <div className="text-sm text-gray-300 mt-2 truncate">{currentFileName}</div>
                      )}
                      {uploadError && <div className="text-red-400 text-sm mt-2">{uploadError}</div>}
                    </div>

                    <ul className="space-y-2">
                      {attachments.length === 0 && (
                        <li className="text-gray-400 text-sm">Keine Anhänge vorhanden</li>
                      )}
                      {attachments.map(attachment => (
                        <li key={attachment.ServerRelativeUrl} className="flex items-center justify-between bg-gray-700 rounded p-2">
                          <a
                            href={buildSharePointAttachmentUrl(attachment.ServerRelativeUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline truncate pr-4"
                          >
                            {attachment.FileName}
                          </a>
                          <button
                            type="button"
                            className="text-red-400 hover:text-red-300 text-sm"
                            onClick={() => handleDeleteAttachment(attachment.FileName)}
                          >
                            Löschen
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p>Projekt-ID nicht gefunden. Bitte versuchen Sie es erneut.</p>
              <button
                onClick={() => router.push('/admin')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Zurück zum Dashboard
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default withAdminAuth(EditProjectPage);