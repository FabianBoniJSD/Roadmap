import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState, type FC } from 'react';
import AdminSubpageLayout from '@/components/AdminSubpageLayout';
import JSDoITLoader from '@/components/JSDoITLoader';
import ProjectForm from '@/components/ProjectForm';
import withAdminAuth from '@/components/withAdminAuth';
import { Category, Project, TeamMember } from '@/types';
import { clientDataService } from '@/utils/clientDataService';
import { resolveSharePointSiteUrl } from '@/utils/sharepointEnv';

type Attachment = {
  FileName: string;
  ServerRelativeUrl: string;
};

const EditProjectPage: FC = () => {
  const router = useRouter();
  const { id } = router.query;

  const [project, setProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [currentFileName, setCurrentFileName] = useState('');

  const uploadAbortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sharePointBaseUrl = useMemo(() => resolveSharePointSiteUrl().replace(/\/$/, ''), []);

  const buildSharePointAttachmentUrl = (serverRelativeUrl: string) => {
    if (!serverRelativeUrl) return '#';
    try {
      return new URL(serverRelativeUrl, `${sharePointBaseUrl}/`).toString();
    } catch {
      const normalized = serverRelativeUrl.startsWith('/')
        ? serverRelativeUrl
        : `/${serverRelativeUrl}`;
      return `${sharePointBaseUrl}${encodeURI(normalized)}`;
    }
  };

  const refreshAttachments = async (projectId: string) => {
    try {
      const list = await clientDataService.listAttachments(projectId);
      setAttachments(list);
    } catch (err) {
      console.error('Error refreshing attachments:', err);
      setAttachments([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id || typeof id !== 'string') return;

      try {
        setLoading(true);
        setError(null);

        const [projectData, categoriesData, teamMembersData, attachmentsData] = await Promise.all([
          clientDataService.getProjectById(id),
          clientDataService.getAllCategories(),
          clientDataService.getTeamMembersForProject(id),
          clientDataService.listAttachments(id),
        ]);

        setProject(projectData);
        setCategories(categoriesData);
        setTeamMembers(teamMembersData);
        setAttachments(attachmentsData);
      } catch (err) {
        console.error('Error fetching project data:', err);
        setError('Projekt konnte nicht geladen werden. Bitte versuchen Sie es erneut.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Reload project data when the route (instance) changes to avoid mixing instances
  }, [id, router.asPath]);

  const handleCancel = () => {
    router.push({ pathname: '/admin', query: router.query });
  };

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const projectId = project?.id || (typeof id === 'string' ? id : null);
    if (!projectId) return;

    const files = event.target.files ? Array.from(event.target.files) : [];
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
          signal: controller.signal,
        });

        if (result.ok) {
          await refreshAttachments(projectId);
        } else if (result.aborted) {
          setUploadError('Upload abgebrochen');
          break;
        } else {
          setUploadError(result.error || 'Upload fehlgeschlagen');
        }
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
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
    uploadAbortRef.current?.abort();
  };

  const handleDeleteAttachment = async (fileName: string) => {
    const projectId = project?.id || (typeof id === 'string' ? id : null);
    if (!projectId) return;

    setUploadError('');
    const ok = await clientDataService.deleteAttachment(projectId, fileName);
    if (ok) {
      setAttachments((prev) => prev.filter((item) => item.FileName !== fileName));
    } else {
      setUploadError('Anhang konnte nicht gelöscht werden.');
    }
  };

  const handleSubmit = async (updatedProject: Project) => {
    try {
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
        fortschritt:
          typeof updatedProject.fortschritt === 'number' ? updatedProject.fortschritt : 0,
        geplante_umsetzung: updatedProject.geplante_umsetzung || '',
        budget: updatedProject.budget || '',
        startDate: '',
        endDate: '',
        projektphase: updatedProject.projektphase || '',
        naechster_meilenstein: updatedProject.naechster_meilenstein || '',
        ProjectFields: [] as string[],
      };

      if (updatedProject.startDate) {
        const startDate = new Date(updatedProject.startDate);
        if (!Number.isNaN(startDate.getTime())) {
          projectToSave.startDate = `${startDate.toISOString().split('T')[0]}T00:00:00Z`;
        }
      }

      if (updatedProject.endDate) {
        const endDate = new Date(updatedProject.endDate);
        if (!Number.isNaN(endDate.getTime())) {
          projectToSave.endDate = `${endDate.toISOString().split('T')[0]}T00:00:00Z`;
        }
      }

      const projectFieldsRaw = updatedProject.ProjectFields as unknown;

      if (projectFieldsRaw) {
        if (Array.isArray(projectFieldsRaw)) {
          projectToSave.ProjectFields = projectFieldsRaw.map((field) => String(field));
        } else if (typeof projectFieldsRaw === 'string') {
          const fieldString = projectFieldsRaw;
          if (fieldString.includes(';') || fieldString.includes(',')) {
            projectToSave.ProjectFields = fieldString
              .split(/[;,]/)
              .map((item) => item.trim())
              .filter(Boolean);
          } else {
            projectToSave.ProjectFields = [fieldString];
          }
        } else {
          projectToSave.ProjectFields = [String(projectFieldsRaw)];
        }
      }

      const teamMembersToSave =
        updatedProject.teamMembers && Array.isArray(updatedProject.teamMembers)
          ? updatedProject.teamMembers.map((member) =>
              typeof member === 'string'
                ? { name: member, role: 'Teammitglied' }
                : { name: member.name, role: member.role || 'Teammitglied' }
            )
          : [];

      const savedProject = await clientDataService.updateProject(
        projectToSave.id,
        projectToSave as Partial<Project>
      );

      try {
        await clientDataService.deleteTeamMembersForProject(savedProject.id);
        for (const member of teamMembersToSave) {
          if (member.name) {
            await clientDataService.createTeamMember({
              name: member.name,
              role: member.role || 'Teammitglied',
              projectId: savedProject.id,
            });
          }
        }
      } catch (err) {
        console.error('Error updating team members:', err);
      }

      if (Array.isArray(updatedProject.links)) {
        try {
          await clientDataService.deleteProjectLinks(savedProject.id);
          for (const link of updatedProject.links) {
            if (link && link.title && link.url) {
              await clientDataService.createProjectLink({
                title: link.title,
                url: link.url,
                projectId: savedProject.id,
              });
            }
          }
        } catch (err) {
          console.error('Error updating links:', err);
        }
      }

      router.push({ pathname: '/admin', query: router.query });
    } catch (err) {
      console.error('Error saving project:', err);
      setError('Projekt konnte nicht gespeichert werden. Bitte prüfen Sie die Eingaben.');
    }
  };

  const attachmentsSection = () => (
    <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 px-6 py-8 shadow-lg shadow-slate-950/40 sm:px-9">
      <header className="space-y-1 border-b border-slate-800/60 pb-5">
        <h2 className="text-lg font-semibold text-white sm:text-xl">Anhänge verwalten</h2>
        <p className="text-sm text-slate-300">
          Laden Sie Dateien hoch oder entfernen Sie bestehende Dokumente. Unterstützte Formate: PDF,
          Office, Bilder, ZIP (max. 25&nbsp;MB je Datei).
        </p>
      </header>

      <div className="mt-6 space-y-5">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelection}
            disabled={uploading}
            className="block w-full cursor-pointer text-sm text-slate-300 file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-slate-700 disabled:opacity-60"
          />
          {uploading && (
            <div className="mt-3 space-y-2">
              <div className="h-2 rounded-full bg-slate-800/70">
                <div
                  className="h-full rounded-full bg-sky-500 transition-[width]"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="truncate">{currentFileName}</span>
                <button
                  type="button"
                  onClick={handleAbortUpload}
                  className="rounded-full border border-slate-700 px-3 py-1 font-semibold text-slate-200 transition hover:border-rose-400 hover:text-rose-100"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
          {uploadError && (
            <p className="mt-2 text-sm text-rose-300" role="alert">
              {uploadError}
            </p>
          )}
        </div>

        <ul className="space-y-2 text-sm text-slate-200">
          {attachments.length === 0 && (
            <li className="rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 text-slate-400">
              Keine Anhänge vorhanden.
            </li>
          )}
          {attachments.map((attachment) => (
            <li
              key={attachment.ServerRelativeUrl}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3"
            >
              <a
                href={buildSharePointAttachmentUrl(attachment.ServerRelativeUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-sky-300 transition hover:text-sky-200"
              >
                {attachment.FileName}
              </a>
              <button
                type="button"
                onClick={() => handleDeleteAttachment(attachment.FileName)}
                className="rounded-full border border-rose-500/50 px-3 py-1 text-xs font-semibold text-rose-200 transition hover:border-rose-400 hover:text-rose-100"
              >
                Löschen
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );

  const resolvedProjectId = typeof id === 'string' ? (project?.id ?? id) : null;

  return (
    <AdminSubpageLayout
      title="Projekt bearbeiten"
      description={
        project
          ? `Passen Sie die Informationen für „${project.title || 'Unbenanntes Projekt'}“ an.`
          : 'Projektinformationen anpassen.'
      }
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Projekte' },
        { label: 'Bearbeiten' },
      ]}
      actions={
        <button
          type="button"
          onClick={() => router.push({ pathname: '/admin', query: router.query })}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 transition hover:border-sky-400 hover:text-white"
        >
          Zur Übersicht
        </button>
      }
    >
      {loading ? (
        <section className="flex items-center justify-center rounded-3xl border border-slate-800/70 bg-slate-950/70 px-6 py-16 shadow-lg shadow-slate-950/30">
          <JSDoITLoader message="Projekt wird geladen …" />
        </section>
      ) : !project || !id || typeof id !== 'string' ? (
        <section className="flex items-center justify-center rounded-3xl border border-slate-800/70 bg-slate-950/70 px-6 py-16 text-center shadow-lg shadow-slate-950/30">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Projekt nicht gefunden</h2>
            <p className="text-sm text-slate-300">
              Das gewünschte Projekt konnte nicht geladen werden. Bitte kehren Sie zum Dashboard
              zurück und wählen Sie ein anderes Projekt aus.
            </p>
            <button
              type="button"
              onClick={() => router.push({ pathname: '/admin', query: router.query })}
              className="rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              Zurück zum Dashboard
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 px-6 py-8 shadow-lg shadow-slate-950/40 sm:px-9">
            {error && (
              <div className="mb-6 rounded-2xl border border-rose-500/50 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            )}
            <ProjectForm
              initialProject={{
                ...project,
                teamMembers: teamMembers.map((member) => ({
                  id: member.id,
                  name: member.name,
                  role: member.role,
                  projectId: member.projectId,
                })),
              }}
              categories={categories}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          </section>

          {resolvedProjectId && attachmentsSection()}
        </>
      )}
    </AdminSubpageLayout>
  );
};

export default withAdminAuth(EditProjectPage);
