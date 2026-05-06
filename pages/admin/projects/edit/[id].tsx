import { useRouter } from 'next/router';
import { useEffect, useRef, useState, type FC } from 'react';
import AdminSubpageLayout from '@/components/AdminSubpageLayout';
import JSDoITLoader from '@/components/JSDoITLoader';
import ProjectForm from '@/components/ProjectForm';
import withAdminAuth from '@/components/withAdminAuth';
import { Category, InstanceBadgeOption, Project, TeamMember } from '@/types';
import { buildInstanceAwareUrl } from '@/utils/auth';
import { clientDataService } from '@/utils/clientDataService';
import { INSTANCE_QUERY_PARAM } from '@/utils/instanceConfig';
import { parseMirroredProjectId } from '@/utils/instanceMirroring';

type Attachment = {
  FileName: string;
  ServerRelativeUrl: string;
};

const EditProjectPage: FC = () => {
  const router = useRouter();
  const { id } = router.query;

  const [project, setProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [instanceBadgeOptions, setInstanceBadgeOptions] = useState<InstanceBadgeOption[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [currentFileName, setCurrentFileName] = useState('');
  const [selectedFilesLabel, setSelectedFilesLabel] = useState('Keine Datei ausgewählt');

  const uploadAbortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fetchRequestIdRef = useRef(0);

  const buildAttachmentDownloadUrl = (projectId: string, fileName: string) => {
    const base = `/api/attachments/${encodeURIComponent(projectId)}/download?name=${encodeURIComponent(
      fileName
    )}`;
    const q = router.query?.[INSTANCE_QUERY_PARAM];
    if (typeof q === 'string' && q) {
      return `${base}&${INSTANCE_QUERY_PARAM}=${encodeURIComponent(q)}`;
    }
    return base;
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
    const requestId = ++fetchRequestIdRef.current;
    const fetchData = async () => {
      if (!id || typeof id !== 'string') return;
      const mirroredRequest = parseMirroredProjectId(id);

      try {
        setLoading(true);
        setError(null);

        const [projectResponse, categoriesResponse, attachmentsData, instancesResponse] =
          await Promise.all([
            fetch(buildInstanceAwareUrl(`/api/projects/${encodeURIComponent(id)}`), {
              headers: { Accept: 'application/json' },
              credentials: 'same-origin',
            }),
            fetch(buildInstanceAwareUrl('/api/categories'), {
              headers: { Accept: 'application/json' },
              credentials: 'same-origin',
            }),
            mirroredRequest ? Promise.resolve([]) : clientDataService.listAttachments(id),
            fetch('/api/instances/slugs', {
              headers: { Accept: 'application/json' },
              credentials: 'same-origin',
            }),
          ]);

        if (!projectResponse.ok || !categoriesResponse.ok) {
          const projectPayload = await projectResponse.json().catch(() => null);
          const categoriesPayload = await categoriesResponse.json().catch(() => null);
          throw new Error(
            projectPayload?.error ||
              categoriesPayload?.error ||
              'Projektdaten konnten nicht geladen werden.'
          );
        }

        const [projectData, categoriesData] = (await Promise.all([
          projectResponse.json(),
          categoriesResponse.json(),
        ])) as [Project | null, Category[]];
        const instancesPayload = await instancesResponse.json().catch(() => null);

        if (requestId !== fetchRequestIdRef.current) return;

        setProject(projectData);
        setCategories(categoriesData);
        setInstanceBadgeOptions(
          Array.isArray(instancesPayload?.instances)
            ? instancesPayload.instances.filter(
                (instance): instance is InstanceBadgeOption =>
                  typeof instance?.slug === 'string' &&
                  typeof instance?.displayName === 'string' &&
                  typeof instance?.badge === 'string' &&
                  instance.badge.trim().length > 0
              )
            : []
        );
        setTeamMembers(Array.isArray(projectData?.teamMembers) ? projectData.teamMembers : []);
        setAttachments(attachmentsData);
      } catch (err) {
        console.error('Error fetching project data:', err);
        if (requestId !== fetchRequestIdRef.current) return;
        setError('Projekt konnte nicht geladen werden. Bitte versuchen Sie es erneut.');
      } finally {
        if (requestId !== fetchRequestIdRef.current) return;
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

    setSelectedFilesLabel(
      files.length === 1 ? files[0].name : `${files.length} Dateien ausgewählt`
    );

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
        setSelectedFilesLabel('Keine Datei ausgewählt');
        if (fileInputRef.current) fileInputRef.current.value = '';
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
      const projectToSave: Project = {
        id: updatedProject.id,
        title: updatedProject.title || '',
        projectType: updatedProject.projectType || 'long',
        category: updatedProject.category || '',
        startQuarter: updatedProject.startQuarter || '',
        endQuarter: updatedProject.endQuarter || '',
        description: updatedProject.description || '',
        status: updatedProject.status || 'planned',
        badges: updatedProject.badges || [],
        projektleitung: updatedProject.projektleitung || '',
        bisher: updatedProject.bisher || '',
        zukunft: updatedProject.zukunft || '',
        fortschritt:
          typeof updatedProject.fortschritt === 'number' ? updatedProject.fortschritt : 0,
        geplante_umsetzung: updatedProject.geplante_umsetzung || '',
        budget: updatedProject.budget || '',
        startDate: '',
        endDate: '',
        projektphase: updatedProject.projektphase || undefined,
        naechster_meilenstein: updatedProject.naechster_meilenstein || '',
        ProjectFields: [] as string[],
        teamMembers: updatedProject.teamMembers,
        links: updatedProject.links,
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
      const response = await fetch(
        buildInstanceAwareUrl(`/api/projects/${encodeURIComponent(projectToSave.id)}`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          credentials: 'same-origin',
          body: JSON.stringify(projectToSave),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Projekt konnte nicht gespeichert werden.');
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              id="attachment-upload"
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelection}
              disabled={uploading}
              className="sr-only"
            />
            <label
              htmlFor="attachment-upload"
              className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                uploading
                  ? 'cursor-not-allowed bg-slate-800/60 text-slate-400'
                  : 'cursor-pointer bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
            >
              Dateien auswählen
            </label>
            <div
              className="flex-1 truncate rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-300"
              aria-live="polite"
            >
              {uploading
                ? currentFileName
                  ? `Lädt hoch: ${currentFileName}`
                  : 'Upload läuft …'
                : selectedFilesLabel}
            </div>
          </div>
          {uploading && (
            <div className="mt-3 space-y-2">
              <div className="h-2 rounded-full bg-slate-800/70">
                <div
                  className="h-full rounded-full bg-sky-500 transition-[width]"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="truncate">{currentFileName || 'Upload läuft …'}</span>
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
                href={buildAttachmentDownloadUrl(
                  resolvedProjectId || String(id),
                  attachment.FileName
                )}
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
      ) : project.isReadOnlyMirror ? (
        <section className="rounded-3xl border border-amber-500/30 bg-amber-500/10 px-6 py-8 shadow-lg shadow-slate-950/40 sm:px-9">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Gespiegeltes Projekt</h2>
            <p className="text-sm text-slate-200">
              Dieses Projekt wird aus der Instanz{' '}
              {project.mirrorSourceInstanceName || project.mirrorSourceInstanceSlug || 'Quelle'}{' '}
              gespiegelt und kann hier nur gelesen werden.
            </p>
            <button
              type="button"
              onClick={() => router.push({ pathname: '/admin', query: router.query })}
              className="rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              Zurück zur Übersicht
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
              instanceBadgeOptions={instanceBadgeOptions}
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
