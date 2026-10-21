import React, { useEffect, useState } from 'react';
import { Project, Category, InstanceBadgeOption, ProjectLink, TeamMember } from '../types';
const uuidv4 = (): string => crypto.randomUUID();
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FaTrash, FaPlus, FaCheck } from 'react-icons/fa';
import SharePointUserPicker, { type SharePointUserOption } from './SharePointUserPicker';
import { normalizeCategoryId } from '@/utils/categoryUtils';
import { getCurrentBrowserInstanceSlug } from '@/utils/auth';
import RichTextEditor from './RichTextEditor';
import ToggleSwitch from './ToggleSwitch';
import {
  buildMirrorTargetGroups,
  removeBadgeCaseInsensitive,
  toggleBadgeCaseInsensitive,
} from '@/utils/projectBadgeUi';
import {
  getRichTextPlainText,
  normalizeRichTextEditorValue,
  sanitizeRichTextHtml,
} from '@/utils/richText';

interface ProjectFormProps {
  initialProject?: Project;
  categories: Category[];
  instanceBadgeOptions?: InstanceBadgeOption[];
  instanceBadgeOptionsError?: string | null;
  instanceSlug?: string | null;
  onSubmit: (project: Project) => void | Promise<void>;
  onCancel: () => void;
}

type ProjectPhase =
  'initialisierung' | 'konzept' | 'realisierung' | 'einführung' | 'einfuehrung' | 'abschluss';

const normalizePhase = (val?: string): ProjectPhase => {
  if (!val) return 'initialisierung';
  const lowered = val.toLowerCase();
  if (lowered === 'einführung') return 'einführung';
  if (lowered === 'einfuehrung') return 'einfuehrung';
  const allowed: ProjectPhase[] = ['initialisierung', 'konzept', 'realisierung', 'abschluss'];
  return allowed.includes(lowered as ProjectPhase) ? (lowered as ProjectPhase) : 'initialisierung';
};

const normalizeBadgeList = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((entry) => String(entry || '').trim()).filter(Boolean)));
  }

  if (typeof value === 'string') {
    return Array.from(
      new Set(
        value
          .split(/[\n,;]+/)
          .map((entry) => entry.trim())
          .filter(Boolean)
      )
    );
  }

  return [];
};

interface ProjectRichTextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
}

const ProjectRichTextField: React.FC<ProjectRichTextFieldProps> = ({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  required = false,
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <RichTextEditor
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      error={Boolean(error)}
    />
    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
  </div>
);

const ProjectForm: React.FC<ProjectFormProps> = ({
  initialProject,
  categories,
  instanceBadgeOptions = [],
  instanceBadgeOptionsError = null,
  instanceSlug = null,
  onSubmit,
  onCancel,
}) => {
  // Projekt-Typ
  const [isShortTerm, setIsShortTerm] = useState<boolean>(
    (initialProject?.projectType || 'long') === 'short'
  );

  // Grundlegende Projektdaten
  const [title, setTitle] = useState(initialProject?.title || '');
  const [description, setDescription] = useState(
    normalizeRichTextEditorValue(initialProject?.description || '')
  );
  const [status, setStatus] = useState(initialProject?.status || 'planned');
  const [startDate, setStartDate] = useState<Date | null>(
    initialProject?.startDate ? new Date(initialProject.startDate) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    initialProject?.endDate ? new Date(initialProject.endDate) : null
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(() =>
    normalizeCategoryId(initialProject?.category || '', categories)
  );
  const [badges, setBadges] = useState<string[]>(() => normalizeBadgeList(initialProject?.badges));
  const [newBadge, setNewBadge] = useState('');

  // Zusätzliche Felder aus dem SharePoint-Schema
  const [projektleitung, setProjektleitung] = useState(initialProject?.projektleitung || '');
  const [bisher, setBisher] = useState(normalizeRichTextEditorValue(initialProject?.bisher || ''));
  const [zukunft, setZukunft] = useState(
    normalizeRichTextEditorValue(initialProject?.zukunft || '')
  );
  const [fortschritt, setFortschritt] = useState(initialProject?.fortschritt || 0);
  const [geplantUmsetzung, setGeplantUmsetzung] = useState(
    initialProject?.geplante_umsetzung || ''
  );
  const [budget, setBudget] = useState(initialProject?.budget || '');
  // Neue Felder: Projektphase & Nächster Meilenstein
  const [projektphase, setProjektphase] = useState<ProjectPhase>(
    normalizePhase(initialProject?.projektphase)
  );
  const [naechsterMeilenstein, setNaechsterMeilenstein] = useState(
    initialProject?.naechster_meilenstein || ''
  );

  const pickerInstanceSlug = instanceSlug?.trim() || getCurrentBrowserInstanceSlug();

  // Teammitglieder
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    if (!initialProject?.teamMembers) return [];
    const rawMembers = initialProject.teamMembers as (TeamMember | string)[];
    if (!rawMembers.length) return [];

    if (typeof rawMembers[0] === 'string') {
      return rawMembers.map((member) => ({
        id: `temp-${uuidv4()}`,
        name: String(member),
        role: 'Teammitglied',
        projectId: initialProject.id,
      }));
    }

    return rawMembers.map((member) =>
      typeof member === 'string'
        ? {
            id: `temp-${uuidv4()}`,
            name: member,
            role: 'Teammitglied',
            projectId: initialProject.id,
          }
        : member
    );
  });

  // Links-Verwaltung
  const [links, setLinks] = useState<ProjectLink[]>(initialProject?.links || []);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Felder-Verwaltung
  const [selectedFields, setSelectedFields] = useState<string[]>(() => {
    if (!initialProject?.ProjectFields) return [];

    // Handle array of strings
    if (Array.isArray(initialProject.ProjectFields)) {
      return initialProject.ProjectFields;
    }

    // Handle string that might be semicolon or comma delimited
    if (typeof initialProject.ProjectFields === 'string') {
      const fieldStr = initialProject.ProjectFields as string;
      if (fieldStr.includes(';') || fieldStr.includes(',')) {
        return fieldStr
          .split(/[;,]/)
          .map((f) => f.trim())
          .filter(Boolean);
      }
      return [fieldStr];
    }

    return [];
  });

  // Validierung
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync when initialProject changes (edit mode populates after load)
  useEffect(() => {
    if (!initialProject) return;
    setIsShortTerm((initialProject?.projectType || 'long') === 'short');
    setTitle(initialProject.title || '');
    setDescription(normalizeRichTextEditorValue(initialProject.description || ''));
    setStatus(initialProject.status || 'planned');
    setStartDate(initialProject.startDate ? new Date(initialProject.startDate) : null);
    setEndDate(initialProject.endDate ? new Date(initialProject.endDate) : null);
    setSelectedCategory(normalizeCategoryId(initialProject.category || '', categories));
    setBadges(normalizeBadgeList(initialProject.badges));
    setProjektleitung(initialProject.projektleitung || '');
    setBisher(normalizeRichTextEditorValue(initialProject.bisher || ''));
    setZukunft(normalizeRichTextEditorValue(initialProject.zukunft || ''));
    setFortschritt(initialProject.fortschritt || 0);
    setGeplantUmsetzung(initialProject.geplante_umsetzung || '');
    setBudget(initialProject.budget || '');
    // ProjectFields normalize
    if (Array.isArray(initialProject.ProjectFields)) {
      setSelectedFields(initialProject.ProjectFields);
    } else if (typeof initialProject.ProjectFields === 'string') {
      const fieldStr = initialProject.ProjectFields as unknown as string;
      if (fieldStr.includes(';') || fieldStr.includes(',')) {
        setSelectedFields(
          fieldStr
            .split(/[;,]/)
            .map((f) => f.trim())
            .filter(Boolean)
        );
      } else if (fieldStr) {
        setSelectedFields([fieldStr]);
      } else {
        setSelectedFields([]);
      }
    } else {
      setSelectedFields([]);
    }
    // Links
    setLinks(initialProject.links || []);
    // Team members normalize
    if (initialProject.teamMembers && initialProject.teamMembers.length) {
      const tms = (initialProject.teamMembers as (string | TeamMember)[]).map((member) =>
        typeof member === 'string'
          ? {
              id: `temp-${uuidv4()}`,
              name: member,
              role: 'Teammitglied',
              projectId: initialProject.id,
            }
          : member
      );
      setTeamMembers(tms);
    } else {
      setTeamMembers([]);
    }
    // Phase & Meilenstein
    setProjektphase(normalizePhase(initialProject.projektphase));
    setNaechsterMeilenstein(initialProject.naechster_meilenstein || '');
  }, [initialProject, categories]);

  // Function to add a team member to the project
  const handleAddTeamMember = (user: SharePointUserOption) => {
    const name = user.displayName || user.label;
    // Check if member is already added
    const isAlreadyAdded = teamMembers.some((member) => {
      if (member.userIdentifier && user.value) {
        return member.userIdentifier.toLowerCase() === user.value.toLowerCase();
      }
      return member.name.toLowerCase() === name.toLowerCase();
    });

    if (isAlreadyAdded) return;

    // Create a new team member object
    const newMember: TeamMember = {
      id: `temp-${uuidv4()}`,
      name,
      role: 'Teammitglied', // Default role
      userIdentifier: user.value,
      projectId: initialProject?.id || '',
    };

    // Update the team members state
    setTeamMembers((prevMembers) => [...prevMembers, newMember]);
  };

  // Function to remove a team member from the project
  const handleRemoveTeamMember = (memberId: string) => {
    setTeamMembers((prevMembers) => prevMembers.filter((member) => member.id !== memberId));
  };

  const addBadge = () => {
    const normalized = newBadge.trim();
    if (!normalized) return;

    setBadges((prev) => {
      const exists = prev.some((badge) => badge.toLowerCase() === normalized.toLowerCase());
      return exists ? prev : [...prev, normalized];
    });
    setNewBadge('');
  };

  const removeBadge = (badgeToRemove: string) => {
    setBadges((prev) => removeBadgeCaseInsensitive(prev, badgeToRemove));
  };

  const toggleBadge = (badgeToToggle: string) => {
    setBadges((prev) => toggleBadgeCaseInsensitive(prev, badgeToToggle));
  };

  // Kategorie auswählen
  const selectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  // Feld umschalten
  const toggleField = (fieldValue: string) => {
    setSelectedFields((prev) => {
      if (prev.includes(fieldValue)) {
        return prev.filter((name) => name !== fieldValue);
      } else {
        return [...prev, fieldValue];
      }
    });
  };

  // Link hinzufügen
  const addLink = () => {
    if (newLinkTitle.trim() && newLinkUrl.trim()) {
      const newLink: ProjectLink = {
        id: uuidv4(),
        title: newLinkTitle.trim(),
        url: newLinkUrl.trim(),
      };

      setLinks([...links, newLink]);
      setNewLinkTitle('');
      setNewLinkUrl('');
    }
  };

  // Link entfernen
  const removeLink = (linkId: string) => {
    setLinks(links.filter((link) => link.id !== linkId));
  };

  // Formular validieren
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Titel ist erforderlich';
    }

    if (!getRichTextPlainText(description)) {
      newErrors.description = 'Beschreibung ist erforderlich';
    }

    if (!selectedCategory) {
      newErrors.category = 'Eine Kategorie muss ausgewählt sein';
    }

    if (!startDate) {
      newErrors.startDate = 'Startdatum ist erforderlich';
    }

    if (!endDate) {
      newErrors.endDate = 'Enddatum ist erforderlich';
    }

    if (startDate && endDate && startDate > endDate) {
      newErrors.dates = 'Das Enddatum muss nach dem Startdatum liegen';
    }

    if (!isShortTerm) {
      if (!projektleitung.trim()) {
        newErrors.projektleitung = 'Projektleitung ist erforderlich';
      }

      if (!getRichTextPlainText(bisher)) {
        newErrors.bisher = 'Bisher-Feld ist erforderlich';
      }

      if (!getRichTextPlainText(zukunft)) {
        newErrors.zukunft = 'Zukunft-Feld ist erforderlich';
      }

      if (!geplantUmsetzung.trim()) {
        newErrors.geplantUmsetzung = 'Geplante Umsetzung ist erforderlich';
      }

      // Add type check before trim for budget
      if (!budget || (typeof budget === 'string' && !budget.trim())) {
        newErrors.budget = 'Budget ist erforderlich';
      } else if (typeof budget === 'string' && !/^\d+$/.test(budget.trim())) {
        newErrors.budget = 'Budget muss eine Zahl sein';
      }
    } else {
      // Kurzzeitprojekt: Budget optional, aber falls gesetzt, muss es numerisch sein
      if (typeof budget === 'string' && budget.trim() && !/^\d+$/.test(budget.trim())) {
        newErrors.budget = 'Budget muss eine Zahl sein';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Formular absenden
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    // Berechnen der Quartale aus den Datumsangaben
    let startQuarter = '';
    let endQuarter = '';

    if (startDate) {
      const quarter = Math.floor(startDate.getMonth() / 3) + 1;
      startQuarter = `Q${quarter} ${startDate.getFullYear()}`;
    }

    if (endDate) {
      const quarter = Math.floor(endDate.getMonth() / 3) + 1;
      endQuarter = `Q${quarter} ${endDate.getFullYear()}`;
    }

    const projectData: Project = {
      id: initialProject?.id || '',
      title,
      description: sanitizeRichTextHtml(description),
      status,
      projectType: isShortTerm ? 'short' : 'long',
      category: selectedCategory,
      startQuarter,
      endQuarter,
      startDate: startDate ? startDate.toISOString() : '',
      endDate: endDate ? endDate.toISOString() : '',
      projektleitung,
      badges,
      bisher: sanitizeRichTextHtml(bisher),
      zukunft: sanitizeRichTextHtml(zukunft),
      fortschritt,
      geplante_umsetzung: geplantUmsetzung,
      budget,
      projektphase: projektphase === 'einführung' ? 'einfuehrung' : projektphase,
      naechster_meilenstein: naechsterMeilenstein || undefined,
      teamMembers,
      links,
      ProjectFields: selectedFields,
    };

    try {
      await onSubmit(projectData);
    } finally {
      setIsSubmitting(false);
    }
  };
  // Definieren Sie die verfügbaren Felder
  const availableFields = [
    { id: 'process', name: 'Prozess', description: 'Prozessbezogene Aspekte' },
    { id: 'technology', name: 'Technologie', description: 'Technologische Aspekte' },
    { id: 'service', name: 'Dienstleistung', description: 'Servicebezogene Aspekte' },
    { id: 'data', name: 'Daten', description: 'Datenbezogene Aspekte' },
    { id: 'security', name: 'Sicherheit', description: 'Sicherheitsaspekte' },
    { id: 'infrastructure', name: 'Infrastruktur', description: 'Infrastrukturaspekte' },
  ];

  const mirrorTargetGroups = buildMirrorTargetGroups(instanceBadgeOptions, pickerInstanceSlug);
  const mirrorTargetByBadge = new Map(
    mirrorTargetGroups.map((group) => [group.badge.toLowerCase(), group])
  );

  const badgesEditor = (
    <section className="mt-2" aria-labelledby="publishing-heading">
      <h3 id="publishing-heading" className="mb-2 text-lg font-medium">
        Sichtbarkeit und Badges (optional)
      </h3>
      <div className="space-y-6 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-5">
        <div>
          <h4 className="text-sm font-semibold text-slate-100">In anderen Roadmaps anzeigen</h4>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            Das Projekt erscheint nach dem Speichern schreibgeschützt in den ausgewählten Roadmaps.
            Die Auswahl gibt Ihnen keinen direkten Zugriff auf diese Roadmaps.
          </p>
          {mirrorTargetGroups.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Ziel-Roadmaps">
              {mirrorTargetGroups.map((group) => {
                const selected = badges.some(
                  (badge) => badge.toLowerCase() === group.badge.toLowerCase()
                );
                const targetNames = group.targets.map((target) => target.displayName).join(', ');
                const inaccessibleCount = group.targets.filter(
                  (target) => target.hasDirectAccess === false
                ).length;
                return (
                  <button
                    key={group.badge.toLowerCase()}
                    type="button"
                    onClick={() => toggleBadge(group.badge)}
                    aria-pressed={selected}
                    className={`min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                      selected
                        ? 'border-sky-400 bg-sky-500/20 text-sky-50 ring-2 ring-sky-400/25'
                        : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-sky-400 hover:text-white'
                    }`}
                    title={`Spiegelung nach ${targetNames} ${selected ? 'entfernen' : 'aktivieren'}`}
                  >
                    <span aria-hidden="true">
                      {selected ? <FaCheck className="inline h-3 w-3" /> : null}
                    </span>
                    {targetNames}
                    {group.targets.length > 1 && (
                      <span className="ml-1 text-slate-400">({group.targets.length} Roadmaps)</span>
                    )}
                    {inaccessibleCount > 0 && (
                      <span className="ml-1 text-slate-400">· kein Direktzugriff</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : instanceBadgeOptionsError ? (
            <p
              className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100"
              role="alert"
            >
              {instanceBadgeOptionsError}
            </p>
          ) : (
            <p className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-400">
              Keine andere Roadmap ist als Spiegelziel konfiguriert.
            </p>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-100">Weitere Badges</h4>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            Diese Badges sind auf Projektkacheln sichtbar und können als Filter verwendet werden.
          </p>
          <label htmlFor="new-project-badge" className="mt-3 block text-xs text-slate-400">
            Neues Badge
          </label>
          <div className="mt-1 grid grid-cols-1 gap-3 md:grid-cols-7">
            <div className="md:col-span-6">
              <input
                id="new-project-badge"
                type="text"
                value={newBadge}
                onChange={(e) => setNewBadge(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addBadge();
                  }
                }}
                placeholder="z. B. Pilot, Priorität oder KI"
                className="min-h-11 w-full rounded-xl border border-slate-800/70 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
              />
            </div>
            <div className="md:col-span-1">
              <button
                type="button"
                onClick={addBadge}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!newBadge.trim()}
                aria-label="Badge hinzufügen"
              >
                <FaPlus aria-hidden="true" />
                <span className="md:sr-only">Hinzufügen</span>
              </button>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-100">Aktive Auswahl</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {badges.length > 0 ? (
              badges.map((badge) => {
                const mirrorTarget = mirrorTargetByBadge.get(badge.toLowerCase());
                const mirrorNames = mirrorTarget?.targets
                  .map((target) => target.displayName)
                  .join(', ');
                return (
                  <span
                    key={badge}
                    className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                      mirrorTarget
                        ? 'border-sky-400/40 bg-sky-500/10 text-sky-100'
                        : 'border-amber-400/30 bg-amber-500/10 text-amber-100'
                    }`}
                  >
                    <span>
                      {badge}
                      {mirrorNames && <span className="ml-1 text-slate-400">→ {mirrorNames}</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBadge(badge)}
                      className="grid size-6 place-items-center rounded-full border border-white/20 text-sm leading-none transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                      aria-label={`${badge} entfernen`}
                    >
                      ×
                    </button>
                  </span>
                );
              })
            ) : (
              <p className="text-sm text-slate-400">Noch keine Badges ausgewählt.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Projektart */}
      <div className="flex items-center justify-between rounded-3xl border border-slate-800/70 bg-slate-950/70 px-4 py-3">
        <div>
          <div className="text-sm font-medium text-slate-100">Projektart</div>
          <div className="text-xs text-slate-400">
            {isShortTerm
              ? 'Kurzzeitprojekt: nur Basisfelder sind Pflicht.'
              : 'Langzeitprojekt: erweiterte Felder sind Pflicht.'}
          </div>
        </div>
        <ToggleSwitch
          label={isShortTerm ? 'Kurzzeit' : 'Langzeit'}
          isOn={isShortTerm}
          onToggle={() => setIsShortTerm((prev) => !prev)}
        />
      </div>

      {/* Titel */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Titel <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`w-full rounded-2xl border px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition ${
            errors.title ? 'border-rose-500 bg-slate-900/60' : 'border-slate-800/70 bg-slate-950'
          } focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30`}
          required
        />
        {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
      </div>

      {/* Beschreibung */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Beschreibung <span className="text-red-500">*</span>
        </label>
        <RichTextEditor
          id="description"
          value={description}
          onChange={setDescription}
          placeholder="Projektbeschreibung eingeben"
          error={Boolean(errors.description)}
        />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
      </div>

      {/* Status */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium mb-1">
          Status <span className="text-red-500">*</span>
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) =>
            setStatus(
              e.target.value as 'planned' | 'in-progress' | 'completed' | 'paused' | 'cancelled'
            )
          }
          className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
          required
        >
          <option value="planned">Geplant</option>
          <option value="in-progress">In Bearbeitung</option>
          <option value="completed">Abgeschlossen</option>
          <option value="paused">Pausiert</option>
          <option value="cancelled">Abgebrochen</option>
        </select>
      </div>

      {/* Datumsbereich */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium mb-1">
            Startdatum <span className="text-red-500">*</span>
          </label>
          <DatePicker
            id="startDate"
            selected={startDate}
            onChange={setStartDate}
            className={`w-full rounded-2xl border px-4 py-2 text-sm text-slate-100 outline-none transition ${
              errors.startDate
                ? 'border-rose-500 bg-slate-900/60'
                : 'border-slate-800/70 bg-slate-950'
            } focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30`}
            dateFormat="dd.MM.yyyy"
            placeholderText="TT.MM.JJJJ"
            required
          />
          {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium mb-1">
            Enddatum <span className="text-red-500">*</span>
          </label>
          <DatePicker
            id="endDate"
            selected={endDate}
            onChange={setEndDate}
            className={`w-full rounded-2xl border px-4 py-2 text-sm text-slate-100 outline-none transition ${
              errors.endDate
                ? 'border-rose-500 bg-slate-900/60'
                : 'border-slate-800/70 bg-slate-950'
            } focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30`}
            dateFormat="dd.MM.yyyy"
            placeholderText="TT.MM.JJJJ"
            minDate={startDate || undefined}
            required
          />
          {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
        </div>
      </div>
      {errors.dates && <p className="text-red-500 text-sm mt-1">{errors.dates}</p>}

      {/* Kategorien */}
      <div>
        <div id="category-label" className="mb-2 block text-sm font-medium">
          Kategorie <span className="text-red-500">*</span>
        </div>
        <div
          className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3"
          role="radiogroup"
          aria-labelledby="category-label"
          aria-describedby={errors.category ? 'category-error' : undefined}
        >
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={selectedCategory === category.id}
              className={`flex min-h-11 items-center rounded border-l-4 p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                selectedCategory === category.id
                  ? 'bg-slate-900/70 text-white'
                  : 'bg-slate-950/60 text-slate-300 opacity-80 hover:opacity-100'
              }`}
              style={{
                borderLeftColor: selectedCategory === category.id ? category.color : 'transparent',
              }}
              onClick={() => selectCategory(category.id)}
            >
              <div
                className="w-4 h-4 rounded-full mr-2"
                style={{ backgroundColor: category.color }}
              />
              <span>{category.name}</span>
            </button>
          ))}
        </div>
        {errors.category && (
          <p id="category-error" className="mt-1 text-sm text-red-500" role="alert">
            {errors.category}
          </p>
        )}
      </div>

      {badgesEditor}

      {/* Erweiterte Angaben (Langzeit Pflicht / Kurzzeit optional) */}
      {isShortTerm ? (
        <details className="rounded-3xl border border-slate-800/70 bg-slate-950/70 px-5 py-4">
          <summary className="cursor-pointer select-none text-sm font-semibold text-slate-100">
            Optionale Angaben anzeigen
          </summary>
          <div className="mt-5 space-y-6">
            {/* Projektleitung */}
            <div>
              <label htmlFor="projektleitung" className="block text-sm font-medium mb-1">
                Projektleitung
              </label>
              <input
                id="projektleitung"
                type="text"
                value={projektleitung}
                onChange={(e) => setProjektleitung(e.target.value)}
                className={`w-full rounded-2xl border px-4 py-2 text-sm text-slate-100 outline-none transition ${
                  errors.projektleitung
                    ? 'border-rose-500 bg-slate-900/60'
                    : 'border-slate-800/70 bg-slate-950'
                } focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30`}
              />
              {errors.projektleitung && (
                <p className="text-red-500 text-sm mt-1">{errors.projektleitung}</p>
              )}
            </div>

            {/* Budget */}
            <div>
              <label htmlFor="budget" className="block text-sm font-medium mb-1">
                Budget (optional)
              </label>
              <input
                id="budget"
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className={`w-full rounded-2xl border px-4 py-2 text-sm text-slate-100 outline-none transition ${
                  errors.budget
                    ? 'border-rose-500 bg-slate-900/60'
                    : 'border-slate-800/70 bg-slate-950'
                } focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30`}
                placeholder="Nur Zahlen (z.B. 150000)"
              />
              {errors.budget && <p className="text-red-500 text-sm mt-1">{errors.budget}</p>}
            </div>

            {/* Projektphase */}
            <div>
              <label htmlFor="projektphase" className="block text-sm font-medium mb-1">
                Projektphase (optional)
              </label>
              <select
                id="projektphase"
                value={projektphase}
                onChange={(e) => setProjektphase(normalizePhase(e.target.value))}
                className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
              >
                <option value="initialisierung">Initialisierung</option>
                <option value="konzept">Konzept</option>
                <option value="realisierung">Realisierung</option>
                <option value="einfuehrung">Einführung</option>
                <option value="abschluss">Abschluss</option>
              </select>
            </div>

            {/* Nächster Meilenstein */}
            <div>
              <label htmlFor="naechsterMeilenstein" className="block text-sm font-medium mb-1">
                Nächster Meilenstein (optional)
              </label>
              <input
                id="naechsterMeilenstein"
                type="text"
                value={naechsterMeilenstein}
                onChange={(e) => setNaechsterMeilenstein(e.target.value)}
                className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                placeholder="z.B. Go-Live Q3 2025"
              />
            </div>

            {/* Bisher */}
            <ProjectRichTextField
              id="bisher"
              label="Bisher (optional)"
              value={bisher}
              onChange={setBisher}
              error={errors.bisher}
              placeholder="Was wurde bisher erreicht?"
            />

            {/* Zukunft */}
            <ProjectRichTextField
              id="zukunft"
              label="In Zukunft (optional)"
              value={zukunft}
              onChange={setZukunft}
              error={errors.zukunft}
              placeholder="Was ist für die Zukunft geplant?"
            />

            {/* Geplante Umsetzung */}
            <div>
              <label htmlFor="geplantUmsetzung" className="block text-sm font-medium mb-1">
                Geplante Umsetzung (optional)
              </label>
              <textarea
                id="geplantUmsetzung"
                value={geplantUmsetzung}
                onChange={(e) => setGeplantUmsetzung(e.target.value)}
                rows={3}
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-100 outline-none transition ${
                  errors.geplantUmsetzung
                    ? 'border-rose-500 bg-slate-900/60'
                    : 'border-slate-800/70 bg-slate-950'
                } focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30`}
                placeholder="Wie soll das Projekt umgesetzt werden?"
              />
              {errors.geplantUmsetzung && (
                <p className="text-red-500 text-sm mt-1">{errors.geplantUmsetzung}</p>
              )}
            </div>

            {/* Felder */}
            <div className="mt-2">
              <h3 className="text-lg font-medium mb-2">Felder (optional)</h3>
              <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-5">
                <p className="mb-4 text-sm text-slate-300">
                  Wählen Sie die Felder aus, die für dieses Projekt relevant sind:
                </p>
                <p className="mb-2 text-xs text-slate-500">
                  Ausgewählt: {selectedFields.length ? selectedFields.join(', ') : 'noch nichts'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableFields.map((field) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`field-${field.id}`}
                        checked={selectedFields.includes(field.name)}
                        onChange={() => toggleField(field.name)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900/70 text-sky-400 focus:ring-2 focus:ring-sky-500"
                      />
                      <label htmlFor={`field-${field.id}`} className="text-sm">
                        {field.name}
                        {field.description && (
                          <span className="block text-xs text-slate-400">{field.description}</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Team-Mitglieder */}
            <div className="mt-2">
              <h3 className="text-lg font-medium mb-2">Team-Mitglieder (optional)</h3>
              <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-5">
                <SharePointUserPicker
                  instanceSlug={pickerInstanceSlug}
                  placeholder="Nach Benutzern suchen …"
                  onSelect={handleAddTeamMember}
                  emptyMessage="Keine passenden SharePoint-Benutzer gefunden."
                />

                <div className="mt-5">
                  <h4 className="text-sm font-medium mb-2">Aktuelle Team-Mitglieder:</h4>
                  {teamMembers.length > 0 ? (
                    <ul className="space-y-2">
                      {teamMembers.map((member) => (
                        <li
                          key={member.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 text-sm text-slate-200"
                        >
                          <div>
                            <span>{member.name}</span>
                            <span className="ml-2 text-xs text-slate-400">
                              ({member.role || 'Teammitglied'})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={member.role || 'Teammitglied'}
                              onChange={(e) => {
                                const newRole = e.target.value;
                                setTeamMembers((prev) =>
                                  prev.map((m) =>
                                    m.id === member.id ? { ...m, role: newRole } : m
                                  )
                                );
                              }}
                              className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                            >
                              <option value="Teammitglied">Teammitglied</option>
                              <option value="Projektleiter">Projektleiter</option>
                              <option value="Fachexperte">Fachexperte</option>
                              <option value="Stakeholder">Stakeholder</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => member.id && handleRemoveTeamMember(member.id)}
                              className="rounded-full border border-rose-500/50 p-1 text-rose-300 transition hover:border-rose-400 hover:text-rose-100"
                              aria-label="Teammitglied entfernen"
                            >
                              <FaTrash size={16} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400">Keine Team-Mitglieder vorhanden</p>
                  )}
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="mt-2">
              <h3 className="text-lg font-medium mb-2">Referenz-Links (optional)</h3>
              <div className="mb-4 space-y-2">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 text-sm text-slate-200"
                  >
                    <div className="flex-grow">
                      <div className="font-semibold text-white">{link.title}</div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold normal-case tracking-normal text-sky-300 transition hover:text-sky-200"
                      >
                        {link.url}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLink(link.id)}
                      className="rounded-full border border-rose-500/50 p-1 text-rose-300 transition hover:border-rose-400 hover:text-rose-100"
                      aria-label="Link entfernen"
                    >
                      <FaTrash size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
                <div className="md:col-span-3">
                  <input
                    type="text"
                    placeholder="Link-Titel"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                  />
                </div>
                <div className="md:col-span-3">
                  <input
                    type="url"
                    placeholder="URL (https://...)"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                  />
                </div>
                <div className="md:col-span-1">
                  <button
                    type="button"
                    onClick={addLink}
                    className="flex w-full items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-white transition hover:bg-sky-400 disabled:opacity-60"
                    disabled={!newLinkTitle.trim() || !newLinkUrl.trim()}
                  >
                    <FaPlus />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </details>
      ) : (
        <>
          {/* Projektleitung */}
          <div>
            <label htmlFor="projektleitung" className="block text-sm font-medium mb-1">
              Projektleitung <span className="text-red-500">*</span>
            </label>
            <input
              id="projektleitung"
              type="text"
              value={projektleitung}
              onChange={(e) => setProjektleitung(e.target.value)}
              className={`w-full rounded-2xl border px-4 py-2 text-sm text-slate-100 outline-none transition ${
                errors.projektleitung
                  ? 'border-rose-500 bg-slate-900/60'
                  : 'border-slate-800/70 bg-slate-950'
              } focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30`}
              required
            />
            {errors.projektleitung && (
              <p className="text-red-500 text-sm mt-1">{errors.projektleitung}</p>
            )}
          </div>

          {/* Budget */}
          <div>
            <label htmlFor="budget" className="block text-sm font-medium mb-1">
              Budget <span className="text-red-500">*</span>
            </label>
            <input
              id="budget"
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className={`w-full rounded-2xl border px-4 py-2 text-sm text-slate-100 outline-none transition ${
                errors.budget
                  ? 'border-rose-500 bg-slate-900/60'
                  : 'border-slate-800/70 bg-slate-950'
              } focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30`}
              placeholder="Nur Zahlen eingeben (z.B. 150000)"
              required
            />
            {errors.budget && <p className="text-red-500 text-sm mt-1">{errors.budget}</p>}
          </div>

          {/* Projektphase */}
          <div>
            <label htmlFor="projektphase" className="block text-sm font-medium mb-1">
              Projektphase
            </label>
            <select
              id="projektphase"
              value={projektphase}
              onChange={(e) => setProjektphase(normalizePhase(e.target.value))}
              className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
            >
              <option value="initialisierung">Initialisierung</option>
              <option value="konzept">Konzept</option>
              <option value="realisierung">Realisierung</option>
              <option value="einfuehrung">Einführung</option>
              <option value="abschluss">Abschluss</option>
            </select>
          </div>

          {/* Nächster Meilenstein (optional) */}
          <div>
            <label htmlFor="naechsterMeilenstein" className="block text-sm font-medium mb-1">
              Nächster Meilenstein (optional)
            </label>
            <input
              id="naechsterMeilenstein"
              type="text"
              value={naechsterMeilenstein}
              onChange={(e) => setNaechsterMeilenstein(e.target.value)}
              className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
              placeholder="z.B. Go-Live Q3 2025"
            />
          </div>

          {/* Bisher */}
          <ProjectRichTextField
            id="bisher"
            label="Bisher"
            value={bisher}
            onChange={setBisher}
            error={errors.bisher}
            placeholder="Was wurde bisher erreicht?"
            required
          />

          {/* Zukunft */}
          <ProjectRichTextField
            id="zukunft"
            label="In Zukunft"
            value={zukunft}
            onChange={setZukunft}
            error={errors.zukunft}
            placeholder="Was ist für die Zukunft geplant?"
            required
          />

          {/* Geplante Umsetzung */}
          <div>
            <label htmlFor="geplantUmsetzung" className="block text-sm font-medium mb-1">
              Geplante Umsetzung <span className="text-red-500">*</span>
            </label>
            <textarea
              id="geplantUmsetzung"
              value={geplantUmsetzung}
              onChange={(e) => setGeplantUmsetzung(e.target.value)}
              rows={3}
              className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-100 outline-none transition ${
                errors.geplantUmsetzung
                  ? 'border-rose-500 bg-slate-900/60'
                  : 'border-slate-800/70 bg-slate-950'
              } focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30`}
              placeholder="Wie soll das Projekt umgesetzt werden?"
              required
            />
            {errors.geplantUmsetzung && (
              <p className="text-red-500 text-sm mt-1">{errors.geplantUmsetzung}</p>
            )}
          </div>

          {/* Felder */}
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Felder</h3>
            <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-5">
              <p className="mb-4 text-sm text-slate-300">
                Wählen Sie die Felder aus, die für dieses Projekt relevant sind:
              </p>
              <p className="mb-2 text-xs text-slate-500">
                Ausgewählt: {selectedFields.length ? selectedFields.join(', ') : 'noch nichts'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableFields.map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`field-${field.id}`}
                      checked={selectedFields.includes(field.name)}
                      onChange={() => toggleField(field.name)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900/70 text-sky-400 focus:ring-2 focus:ring-sky-500"
                    />
                    <label htmlFor={`field-${field.id}`} className="text-sm">
                      {field.name}
                      {field.description && (
                        <span className="block text-xs text-slate-400">{field.description}</span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Team-Mitglieder with search */}
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Team-Mitglieder</h3>
            <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-5">
              <SharePointUserPicker
                instanceSlug={pickerInstanceSlug}
                placeholder="Nach Benutzern suchen …"
                onSelect={handleAddTeamMember}
                emptyMessage="Keine passenden SharePoint-Benutzer gefunden."
              />

              <div className="mt-5">
                <h4 className="text-sm font-medium mb-2">Aktuelle Team-Mitglieder:</h4>
                {teamMembers.length > 0 ? (
                  <ul className="space-y-2">
                    {teamMembers.map((member) => (
                      <li
                        key={member.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 text-sm text-slate-200"
                      >
                        <div>
                          <span>{member.name}</span>
                          <span className="ml-2 text-xs text-slate-400">
                            ({member.role || 'Teammitglied'})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={member.role || 'Teammitglied'}
                            onChange={(e) => {
                              const newRole = e.target.value;
                              setTeamMembers((prev) =>
                                prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m))
                              );
                            }}
                            className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                          >
                            <option value="Teammitglied">Teammitglied</option>
                            <option value="Projektleiter">Projektleiter</option>
                            <option value="Fachexperte">Fachexperte</option>
                            <option value="Stakeholder">Stakeholder</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => member.id && handleRemoveTeamMember(member.id)}
                            className="rounded-full border border-rose-500/50 p-1 text-rose-300 transition hover:border-rose-400 hover:text-rose-100"
                            aria-label="Teammitglied entfernen"
                          >
                            <FaTrash size={16} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">Keine Team-Mitglieder vorhanden</p>
                )}
              </div>
            </div>
          </div>

          {/* Links-Bereich */}
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Referenz-Links</h3>

            <div className="mb-4 space-y-2">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 text-sm text-slate-200"
                >
                  <div className="flex-grow">
                    <div className="font-semibold text-white">{link.title}</div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold normal-case tracking-normal text-sky-300 transition hover:text-sky-200"
                    >
                      {link.url}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLink(link.id)}
                    className="rounded-full border border-rose-500/50 p-1 text-rose-300 transition hover:border-rose-400 hover:text-rose-100"
                    aria-label="Link entfernen"
                  >
                    <FaTrash size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
              <div className="md:col-span-3">
                <input
                  type="text"
                  placeholder="Link-Titel"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                />
              </div>
              <div className="md:col-span-3">
                <input
                  type="url"
                  placeholder="URL (https://...)"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                />
              </div>
              <div className="md:col-span-1">
                <button
                  type="button"
                  onClick={addLink}
                  className="flex w-full items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-white transition hover:bg-sky-400 disabled:opacity-60"
                  disabled={!newLinkTitle.trim() || !newLinkUrl.trim()}
                >
                  <FaPlus />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-60"
          disabled={isSubmitting}
          aria-live="polite"
        >
          {isSubmitting ? 'Wird gespeichert …' : initialProject ? 'Aktualisieren' : 'Erstellen'}
        </button>
      </div>
    </form>
  );
};

export default ProjectForm;
