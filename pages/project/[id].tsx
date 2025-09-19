import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { clientDataService } from '@/utils/clientDataService';
import { FaExternalLinkAlt } from 'react-icons/fa';
import { Project, TeamMember } from '@/types';
import { hasAdminAccess } from '@/utils/auth';
import { resolveSharePointSiteUrl } from '@/utils/sharepointEnv';

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed': return 'bg-green-500';
    case 'in-progress': return 'bg-blue-500';
    case 'planned': return 'bg-gray-500';
    case 'paused': return 'bg-yellow-500';
    case 'cancelled': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getStatusText = (status: string): string => {
  switch (status) {
    case 'completed': return 'Abgeschlossen';
    case 'in-progress': return 'In Bearbeitung';
    case 'planned': return 'Geplant';
    case 'paused': return 'Pausiert';
    case 'cancelled': return 'Abgebrochen';
    default: return 'Unbekannt';
  }
};

// Hilfsfunktion zum Formatieren von Datumsangaben
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Improved helper function to clean up ProjectFields data
const cleanProjectFields = (fieldsData: string | string[]): string[] => {
  if (!fieldsData) return [];

  // If it's already an array, filter out empty items
  if (Array.isArray(fieldsData)) {
    return fieldsData.filter(item => item && item.trim() !== '');
  }

  // Convert to string if it's not already
  const fieldsString = fieldsData.toString();

  // First, try to extract the actual field values from the end of the string
  // Look for a pattern of words separated by semicolons at the end of the string
  const endPattern = /(?:[A-Za-zÀ-ÖØ-öø-ÿ]+(?:;\s*[A-Za-zÀ-ÖØ-öø-ÿ]+)*|[A-Za-zÀ-ÖØ-öø-ÿ]+(?:;\s*[A-Za-zÀ-ÖØ-öø-ÿ]+)*)$/;
  const matches = fieldsString.match(endPattern);

  if (matches && matches[0]) {
    // If we found a match, split by semicolon and clean each item
    return matches[0]
      .split(';')
      .map(item => item.trim())
      .filter(Boolean);
  }

  // If the above didn't work, try a more aggressive approach
  // Remove all HTML tags first
  const noHtml = fieldsString.replace(/<[^>]*>/g, '');

  // Then look for words (allowing German characters) and split them
  const words = noHtml.match(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g) || [];

  // Group words that are likely part of the same field
  // This is a heuristic approach - we're assuming fields start with capital letters
  const fields: string[] = [];
  let currentField = '';

  for (const word of words) {
    // If word starts with uppercase and we already have a current field,
    // it's likely a new field
    if (/^[A-ZÀ-ÖØ-ÿ]/.test(word) && currentField) {
      fields.push(currentField);
      currentField = word;
    } else {
      // Otherwise, append to current field
      currentField = currentField ? `${currentField} ${word}` : word;
    }
  }

  // Add the last field if there is one
  if (currentField) {
    fields.push(currentField);
  }

  return fields.filter(Boolean);
};

const ProjectDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ FileName: string; ServerRelativeUrl: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const spSite = resolveSharePointSiteUrl().replace(/\/$/, '');
  const [uploadPct, setUploadPct] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string>('');
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [abortCtrl, setAbortCtrl] = useState<AbortController | null>(null);

  useEffect(() => {
    if (id) {
      setLoading(true);
      clientDataService.getProjectById(id as string)
        .then((data: { startDate: string; endDate: string } & Project | null) => {
          if (!data) {
            throw new Error('Project not found');
          }
          setProject(data);
          // fetch attachments after project loads
          clientDataService.listAttachments(id as string).then(setAttachments).catch(() => setAttachments([]));
          setLoading(false);
        })
        .catch((error: Error) => {
          console.error('Error fetching project:', error);
          setLoading(false);
        });
    }
  }, [id]);

  useEffect(() => {
    // Check admin access to show the edit button
    (async () => {
      try {
        const ok = await hasAdminAccess();
        setIsAdmin(!!ok);
      } catch {
        setIsAdmin(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (project && project.teamMembers) {
      console.log('Team members structure:', JSON.stringify(project.teamMembers, null, 2));
    }
  }, [project]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="w-full min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <p className="mb-4">Project not found</p>
        <Link href="/">
          <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors">
            Zurück zur Roadmap
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header section */}
        <div className="mb-8">
          <Link href="/">
            <button className="mb-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center transition-colors">
              <span className="mr-2">←</span> Zurück zur Roadmap
            </button>
          </Link>

          <h1 className="text-3xl font-bold mb-3 text-white break-words">{project.title}</h1>

          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-3 ${getStatusColor(project.status)}`}>
            {getStatusText(project.status)}
          </span>

          {isAdmin && (
            <Link href={`/admin/projects/edit/${project.id}`}>
              <button className="ml-3 inline-flex items-center bg-gray-700 hover:bg-gray-600 text-white py-1.5 px-3 rounded border border-gray-600">
                Bearbeiten
              </button>
            </Link>
          )}

          <div className="text-gray-300 mb-4">
            <p>Zeitraum: {formatDate(project.startDate)} bis {formatDate(project.endDate)}</p>
          </div>
        </div>

        {/* Separator */}
        <div className="w-full h-px bg-gray-700 mb-8"></div>

  {/* Content grid with clear separation */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - 3 boxes */}
          <div className="space-y-8">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-md">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-gray-700 text-white">Beschreibung</h2>
              <p className="text-gray-300 break-words">{project.description || 'Keine Daten'}</p>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-md">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-gray-700 text-white">Bisher</h2>
              <p className="text-gray-300 break-words">{project.bisher || 'Keine Daten'}</p>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-md">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-gray-700 text-white">In Zukunft</h2>
              <p className="text-gray-300 break-words">{project.zukunft || 'Keine Daten'}</p>
            </div>

            {/* Links-Bereich */}
            {project.links && project.links.length > 0 && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-md">
                <h2 className="text-xl font-bold mb-4 pb-3 border-b border-gray-700 text-white">Referenzen</h2>
                <div className="space-y-3">
                  {project.links.map(link => (
                    <div key={link.id} className="bg-gray-700 p-3 rounded">
                      <div className="font-medium mb-1">{link.title}</div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline flex items-center text-sm"
                      >
                        <span className="truncate">{link.url}</span>
                        <FaExternalLinkAlt className="ml-1 text-xs flex-shrink-0" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Middle Column - 2 boxes */}
          <div className="space-y-8">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-md">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-gray-700 text-white">Felder</h2>
      <div className="space-y-6">
                <div>
                  {project.ProjectFields ? (
                    <ul className="list-disc pl-5">
                      {cleanProjectFields(project.ProjectFields).map((item: string, index: number) => (
                        <li key={index} className="mb-2 text-gray-300 break-words">{item}</li>
                      ))}
                    </ul>
                  ) : (
        <p className="text-gray-400">Keine Felder vorhanden</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-md">
              <h3 className="text-xl font-bold mb-4 pb-3 border-b border-gray-700 text-white">Team</h3>
              <div className="space-y-4">
                {/* Project Lead */}
                {project.projektleitung && (
                  <div key='0' className="bg-gray-700 rounded-lg p-4 flex items-center space-x-3">
                    {project.projektleitungImageUrl ? (
                      <img
                        src={project.projektleitungImageUrl}
                        alt={project.projektleitung}
                        className="w-12 h-12 flex-shrink-0 rounded-full object-cover border border-gray-600"
                        onError={(e) => {
                          // If image fails to load, fall back to initials
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}

                    {/* Fallback to initials */}
                    <div className={`w-12 h-12 flex-shrink-0 rounded-full bg-gray-600 flex items-center justify-center text-white text-lg ${project.projektleitungImageUrl ? 'hidden' : ''}`}>
                      {project.projektleitung[0]}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium truncate">{project.projektleitung}</p>
                      <p className="text-gray-400 text-sm truncate">Projektleitung</p>
                    </div>
                  </div>
                )}

                {/* Team Members */}
                {project.teamMembers && project.teamMembers.length > 0 ? (
                  project.teamMembers.map((teamMember: TeamMember, index: number) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-4 flex items-center space-x-3">
                      {teamMember.imageUrl ? (
                        <img
                          src={teamMember.imageUrl}
                          alt={teamMember.name}
                          className="w-12 h-12 flex-shrink-0 rounded-full object-cover border border-gray-600"
                          onError={(e) => {
                            // If image fails to load, fall back to initials
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}

                      {/* Fallback to initials */}
                      <div className={`w-12 h-12 flex-shrink-0 rounded-full bg-gray-600 flex items-center justify-center text-white text-lg ${teamMember.imageUrl ? 'hidden' : ''}`}>
                        {teamMember.name ? teamMember.name.charAt(0) : 'T'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium truncate">{teamMember.name || 'Team Member'}</p>
                        <p className="text-gray-400 text-sm truncate">{teamMember.role || 'Teammitglied'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">Keine weiteren Team-Mitglieder</p>
                )}
              </div>
            </div>

          </div>

          {/* Right Column - 3 boxes */}
          <div className="space-y-8">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-md">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-gray-700 text-white">Geplante Umsetzung</h2>
              <p className="text-gray-300 break-words">{project.geplante_umsetzung || 'Keine Daten'}</p>
            </div>

            {/* Optional: Nächster Meilenstein nur anzeigen, wenn befüllt */}
            {project.naechster_meilenstein && project.naechster_meilenstein.trim() !== '' && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-md">
                <h2 className="text-xl font-bold mb-4 pb-3 border-b border-gray-700 text-white">Nächster Meilenstein</h2>
                <p className="text-gray-300 break-words">{project.naechster_meilenstein}</p>
              </div>
            )}

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-md">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-gray-700 text-white">Budget</h2>
              <p className="text-gray-300 text-2xl font-semibold">{project.budget ? `${project.budget} CHF` : 'Keine Daten'}</p>
            </div>

            {/* Attachments */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-md">
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-gray-700 text-white">Anhänge</h2>
              <div className="space-y-3">
                {isAdmin && (
                  <div>
                    <input
                      id="file-input"
                      type="file"
                      multiple
                      className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600"
                      onChange={async (e) => {
                        const files: File[] = e.target.files ? Array.from(e.target.files) : [];
                        if (files.length === 0 || !project) return;
                        setUploadError('');
                        setUploadPct(0);
                        setUploading(true);
                        for (const file of files) {
                          setCurrentFileName(file.name);
                          const controller = new AbortController();
                          setAbortCtrl(controller);
                          const res = await clientDataService.uploadAttachment(project.id, file, { onProgress: (p) => setUploadPct(p), signal: controller.signal });
                          if (res.ok) {
                            const list = await clientDataService.listAttachments(project.id);
                            setAttachments(list);
                          } else if (res.aborted) {
                            setUploadError('Upload abgebrochen');
                            break;
                          } else {
                            setUploadError(res.error || 'Upload fehlgeschlagen');
                            // continue to next file
                          }
                        }
                        setAbortCtrl(null);
                        setCurrentFileName('');
                        setUploading(false);
                        e.currentTarget.value = '';
                      }}
                      disabled={uploading}
                    />
                    {uploading && (
                      <div className="h-2 bg-gray-700 rounded mt-2 overflow-hidden">
                        <div className="h-full bg-blue-600" style={{ width: `${uploadPct}%` }} />
                      </div>
                    )}
                    {currentFileName && (
                      <div className="flex items-center justify-between mt-2 text-sm text-gray-300">
                        <span className="truncate mr-2">{currentFileName}</span>
                        {abortCtrl && (
                          <button
                            className="ml-2 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 border border-gray-600"
                            onClick={() => {
                              abortCtrl.abort();
                            }}
                          >
                            Abbrechen
                          </button>
                        )}
                      </div>
                    )}
                    {uploadError && <div className="text-red-400 text-sm mt-2">{uploadError}</div>}
                  </div>
                )}
                <ul className="space-y-2">
                  {attachments.length === 0 && <li className="text-gray-400 text-sm">Keine Anhänge</li>}
                  {attachments.map(a => (
                    <li key={a.ServerRelativeUrl} className="flex items-center justify-between bg-gray-700 rounded p-2">
                      <a href={`${spSite}${a.ServerRelativeUrl}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate pr-4">{a.FileName}</a>
                      {isAdmin && (
                        <button
                          className="text-red-400 hover:text-red-300 text-sm"
                          onClick={async () => {
                            if (!project) return;
                            const ok = await clientDataService.deleteAttachment(project.id, a.FileName);
                            if (ok) {
                              setAttachments(prev => prev.filter(x => x.FileName !== a.FileName));
                            } else {
                              alert('Löschen fehlgeschlagen');
                            }
                          }}
                        >
                          Löschen
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width phase tiles at the bottom */}
        <div className="mt-8">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-md">
            <h2 className="text-xl font-bold mb-4 pb-3 border-b border-gray-700 text-white">Projektphase</h2>
            {renderPhaseTimeline(project.projektphase)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;

// Helfer: Timeline der Projektphasen mit Markierung der aktiven Phase
function renderPhaseTimeline(phase?: string) {
  // Normalize phase key (um Umlaute/Varianten abzudecken)
  const norm = (phase || '').toLowerCase();
  const active = norm.replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue');
  const steps: { key: string; label: string; desc: string }[] = [
    { key: 'initialisierung', label: 'Initialisierung', desc: 'Grundlagen, Ziele und Machbarkeit klären.' },
    { key: 'konzept', label: 'Konzept', desc: 'Lösungsansätze ausarbeiten, Konzept erstellen.' },
    { key: 'realisierung', label: 'Realisierung', desc: 'Umsetzung, Integration und Tests.' },
    { key: 'einfuehrung', label: 'Einführung', desc: 'Schrittweise Überführung und Rollout.' },
    { key: 'abschluss', label: 'Abschluss', desc: 'Ergebnisse prüfen, Doku übergeben, Abschluss.' },
  ];
  return (
    <div className="rounded border border-gray-700 p-4 bg-gray-900">
      <div className="grid grid-cols-5 gap-2">
        {steps.map((s) => {
          const isActive = active ? active === s.key : false;
          return (
            <div key={s.key} className={`relative p-3 rounded-md text-center ${isActive ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-300'}`}>
              <div className="font-semibold">{s.label}</div>
              <div className="text-xs mt-1 opacity-80 leading-snug">{s.desc}</div>
              {/* Chevron effect */}
              <div className={`absolute top-1/2 -right-2 transform -translate-y-1/2 border-y-8 border-y-transparent border-l-8 ${isActive ? 'border-l-blue-700' : 'border-l-gray-800'}`} />
            </div>
          );
        })}
      </div>
      {!active && (
        <div className="text-xs text-gray-400 mt-3">Keine Phase gesetzt.</div>
      )}
    </div>
  );
}