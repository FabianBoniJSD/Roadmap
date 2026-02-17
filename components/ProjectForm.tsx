import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Project, Category, ProjectLink, TeamMember } from '../types';
import { v4 as uuidv4 } from 'uuid';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FaTrash, FaPlus } from 'react-icons/fa';
import { clientDataService } from '@/utils/clientDataService';
import JSDoITLoader from './JSDoITLoader';
import { normalizeCategoryId } from '@/utils/categoryUtils';
import ToggleSwitch from './ToggleSwitch';

interface ProjectFormProps {
  initialProject?: Project;
  categories: Category[];
  onSubmit: (project: Project) => void;
  onCancel: () => void;
}

type ProjectPhase =
  | 'initialisierung'
  | 'konzept'
  | 'realisierung'
  | 'einführung'
  | 'einfuehrung'
  | 'abschluss';

const normalizePhase = (val?: string): ProjectPhase => {
  if (!val) return 'initialisierung';
  const lowered = val.toLowerCase();
  if (lowered === 'einführung') return 'einführung';
  if (lowered === 'einfuehrung') return 'einfuehrung';
  const allowed: ProjectPhase[] = ['initialisierung', 'konzept', 'realisierung', 'abschluss'];
  return allowed.includes(lowered as ProjectPhase) ? (lowered as ProjectPhase) : 'initialisierung';
};

const ProjectForm: React.FC<ProjectFormProps> = ({
  initialProject,
  categories,
  onSubmit,
  onCancel,
}) => {
  // Projekt-Typ
  const [isShortTerm, setIsShortTerm] = useState<boolean>(
    (initialProject?.projectType || 'long') === 'short'
  );

  // Grundlegende Projektdaten
  const [title, setTitle] = useState(initialProject?.title || '');
  const [description, setDescription] = useState(initialProject?.description || '');
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

  // Zusätzliche Felder aus dem SharePoint-Schema
  const [projektleitung, setProjektleitung] = useState(initialProject?.projektleitung || '');
  const [bisher, setBisher] = useState(initialProject?.bisher || '');
  const [zukunft, setZukunft] = useState(initialProject?.zukunft || '');
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

  // Phase info texts
  const [phaseninfoInitialisierung, setPhaseninfoInitialisierung] = useState(
    initialProject?.phaseninfo_initialisierung || ''
  );
  const [phaseninfoKonzept, setPhaseninfoKonzept] = useState(
    initialProject?.phaseninfo_konzept || ''
  );
  const [phaseninfoRealisierung, setPhaseninfoRealisierung] = useState(
    initialProject?.phaseninfo_realisierung || ''
  );
  const [phaseninfoEinfuehrung, setPhaseninfoEinfuehrung] = useState(
    initialProject?.phaseninfo_einfuehrung || ''
  );
  const [phaseninfoAbschluss, setPhaseninfoAbschluss] = useState(
    initialProject?.phaseninfo_abschluss || ''
  );

  // Team member search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TeamMember[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  // Team member search functionality
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await clientDataService.searchUsers(trimmed);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching for users:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Auto-search when query changes
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // Sync when initialProject changes (edit mode populates after load)
  useEffect(() => {
    if (!initialProject) return;
    setIsShortTerm((initialProject?.projectType || 'long') === 'short');
    setTitle(initialProject.title || '');
    setDescription(initialProject.description || '');
    setStatus(initialProject.status || 'planned');
    setStartDate(initialProject.startDate ? new Date(initialProject.startDate) : null);
    setEndDate(initialProject.endDate ? new Date(initialProject.endDate) : null);
    setSelectedCategory(normalizeCategoryId(initialProject.category || '', categories));
    setProjektleitung(initialProject.projektleitung || '');
    setBisher(initialProject.bisher || '');
    setZukunft(initialProject.zukunft || '');
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
    // Phase info texts
    setPhaseninfoInitialisierung(initialProject.phaseninfo_initialisierung || '');
    setPhaseninfoKonzept(initialProject.phaseninfo_konzept || '');
    setPhaseninfoRealisierung(initialProject.phaseninfo_realisierung || '');
    setPhaseninfoEinfuehrung(initialProject.phaseninfo_einfuehrung || '');
    setPhaseninfoAbschluss(initialProject.phaseninfo_abschluss || '');
  }, [initialProject, categories]);

  // Function to add a team member to the project
  const handleAddTeamMember = (member: TeamMember) => {
    // Check if member is already added
    const isAlreadyAdded = teamMembers.some(
      (m) => m.name.toLowerCase() === member.name.toLowerCase()
    );

    if (isAlreadyAdded) return;

    // Create a new team member object
    const newMember = {
      id: `temp-${uuidv4()}`,
      name: member.name,
      role: 'Teammitglied', // Default role
      projectId: initialProject?.id || '',
    };

    // Update the team members state
    setTeamMembers((prevMembers) => [...prevMembers, newMember]);

    // Clear search
    setSearchQuery('');
    setSearchResults([]);
  };

  // Function to remove a team member from the project
  const handleRemoveTeamMember = (memberId: string) => {
    setTeamMembers((prevMembers) => prevMembers.filter((member) => member.id !== memberId));
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

    if (!description.trim()) {
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

      if (!bisher.trim()) {
        newErrors.bisher = 'Bisher-Feld ist erforderlich';
      }

      if (!zukunft.trim()) {
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
  const handleSubmit = (e: React.FormEvent) => {
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
      description,
      status,
      projectType: isShortTerm ? 'short' : 'long',
      category: selectedCategory,
      startQuarter,
      endQuarter,
      startDate: startDate ? startDate.toISOString() : '',
      endDate: endDate ? endDate.toISOString() : '',
      projektleitung,
      bisher,
      zukunft,
      fortschritt,
      geplante_umsetzung: geplantUmsetzung,
      budget,
      projektphase: projektphase === 'einführung' ? 'einfuehrung' : projektphase,
      naechster_meilenstein: naechsterMeilenstein || undefined,
      phaseninfo_initialisierung: phaseninfoInitialisierung || undefined,
      phaseninfo_konzept: phaseninfoKonzept || undefined,
      phaseninfo_realisierung: phaseninfoRealisierung || undefined,
      phaseninfo_einfuehrung: phaseninfoEinfuehrung || undefined,
      phaseninfo_abschluss: phaseninfoAbschluss || undefined,
      teamMembers,
      links,
      ProjectFields: selectedFields,
    };

    onSubmit(projectData);
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
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition ${
            errors.description
              ? 'border-rose-500 bg-slate-900/60'
              : 'border-slate-800/70 bg-slate-950'
          } focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30`}
          required
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
        <label className="block text-sm font-medium mb-2">
          Kategorie <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`flex items-center p-2 rounded cursor-pointer transition-all ${
                selectedCategory === category.id
                  ? 'bg-slate-900/70 border-l-4 border-sky-500/60'
                  : 'bg-slate-950/60 opacity-70'
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
            </div>
          ))}
        </div>
        {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
      </div>

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
          </div>

          {/* Phaseninformationen Section */}
          <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/50 p-6">
            <h3 className="text-base font-semibold text-slate-100">
              Phaseninformationen (optional)
            </h3>
            <p className="text-xs text-slate-400">
              Fügen Sie für jede Projektphase einen kurzen beschreibenden Text hinzu.
            </p>

            {/* Initialisierung Phase Info */}
            <div>
              <label
                htmlFor="phaseninfoInitialisierung"
                className="block text-sm font-medium mb-1"
              >
                Initialisierung
              </label>
              <textarea
                id="phaseninfoInitialisierung"
                value={phaseninfoInitialisierung}
                onChange={(e) => setPhaseninfoInitialisierung(e.target.value)}
                rows={2}
                className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                placeholder="Informationen zur Initialisierungsphase"
              />
            </div>

            {/* Konzept Phase Info */}
            <div>
              <label htmlFor="phaseninfoKonzept" className="block text-sm font-medium mb-1">
                Konzept
              </label>
              <textarea
                id="phaseninfoKonzept"
                value={phaseninfoKonzept}
                onChange={(e) => setPhaseninfoKonzept(e.target.value)}
                rows={2}
                className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                placeholder="Informationen zur Konzeptphase"
              />
            </div>

            {/* Realisierung Phase Info */}
            <div>
              <label htmlFor="phaseninfoRealisierung" className="block text-sm font-medium mb-1">
                Realisierung
              </label>
              <textarea
                id="phaseninfoRealisierung"
                value={phaseninfoRealisierung}
                onChange={(e) => setPhaseninfoRealisierung(e.target.value)}
                rows={2}
                className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                placeholder="Informationen zur Realisierungsphase"
              />
            </div>

            {/* Einführung Phase Info */}
            <div>
              <label htmlFor="phaseninfoEinfuehrung" className="block text-sm font-medium mb-1">
                Einführung
              </label>
              <textarea
                id="phaseninfoEinfuehrung"
                value={phaseninfoEinfuehrung}
                onChange={(e) => setPhaseninfoEinfuehrung(e.target.value)}
                rows={2}
                className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                placeholder="Informationen zur Einführungsphase"
              />
            </div>

            {/* Abschluss Phase Info */}
            <div>
              <label htmlFor="phaseninfoAbschluss" className="block text-sm font-medium mb-1">
                Abschluss
              </label>
              <textarea
                id="phaseninfoAbschluss"
                value={phaseninfoAbschluss}
                onChange={(e) => setPhaseninfoAbschluss(e.target.value)}
                rows={2}
                className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                placeholder="Informationen zur Abschlussphase"
              />
            </div>
          </div>

          <div className="space-y-4">
            {/* Bisher */}
            <div>
              <label htmlFor="bisher" className="block text-sm font-medium mb-1">
                Bisher (optional)
              </label>
              <textarea
                id="bisher"
                value={bisher}
                onChange={(e) => setBisher(e.target.value)}
                rows={3}
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-100 outline-none transition ${
                  errors.bisher
                    ? 'border-rose-500 bg-slate-900/60'
                    : 'border-slate-800/70 bg-slate-950'
                } focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30`}
                placeholder="Was wurde bisher erreicht?"
              />
              {errors.bisher && <p className="text-red-500 text-sm mt-1">{errors.bisher}</p>}
            </div>

            {/* Zukunft */}
            <div>
              <label htmlFor="zukunft" className="block text-sm font-medium mb-1">
                In Zukunft (optional)
              </label>
              <textarea
                id="zukunft"
                value={zukunft}
                onChange={(e) => setZukunft(e.target.value)}
                rows={3}
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-100 outline-none transition ${
                  errors.zukunft
                    ? 'border-rose-500 bg-slate-900/60'
                    : 'border-slate-800/70 bg-slate-950'
                } focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30`}
                placeholder="Was ist für die Zukunft geplant?"
              />
              {errors.zukunft && <p className="text-red-500 text-sm mt-1">{errors.zukunft}</p>}
            </div>

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
                  Selected fields: {selectedFields.join(', ')}
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
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nach Benutzern suchen..."
                    className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                  />
                  {isSearching && (
                    <div className="absolute right-2 top-1.5">
                      <JSDoITLoader
                        sizeRem={0.7}
                        message=""
                        showGlow={false}
                        className="flex-row gap-1 px-0 py-0 text-sky-200"
                      />
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="absolute z-10 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-800/70 bg-slate-950/95 shadow-xl shadow-slate-950/40 backdrop-blur">
                      <ul>
                        {searchResults.map((user) => (
                          <li
                            key={user.id || user.name}
                            className="flex cursor-pointer items-center justify-between border-b border-slate-800/60 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-900/80 last:border-0"
                            onClick={() => handleAddTeamMember(user)}
                          >
                            <span>{user.name}</span>
                            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">
                              Hinzufügen
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

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
                        className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300 transition hover:text-sky-200"
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

          {/* Phaseninformationen Section */}
          <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/50 p-6">
            <h3 className="text-base font-semibold text-slate-100">
              Phaseninformationen (optional)
            </h3>
            <p className="text-xs text-slate-400">
              Fügen Sie für jede Projektphase einen kurzen beschreibenden Text hinzu.
            </p>

            {/* Initialisierung Phase Info */}
            <div>
              <label htmlFor="phaseninfoInitialisierung-short" className="block text-sm font-medium mb-1">
                Initialisierung
              </label>
              <textarea
                id="phaseninfoInitialisierung-short"
                value={phaseninfoInitialisierung}
                onChange={(e) => setPhaseninfoInitialisierung(e.target.value)}
                rows={2}
                className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                placeholder="Informationen zur Initialisierungsphase"
              />
            </div>

            {/* Konzept Phase Info */}
            <div>
              <label htmlFor="phaseninfoKonzept-short" className="block text-sm font-medium mb-1">
                Konzept
              </label>
              <textarea
                id="phaseninfoKonzept-short"
                value={phaseninfoKonzept}
                onChange={(e) => setPhaseninfoKonzept(e.target.value)}
                rows={2}
                className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                placeholder="Informationen zur Konzeptphase"
              />
            </div>

            {/* Realisierung Phase Info */}
            <div>
              <label htmlFor="phaseninfoRealisierung-short" className="block text-sm font-medium mb-1">
                Realisierung
              </label>
              <textarea
                id="phaseninfoRealisierung-short"
                value={phaseninfoRealisierung}
                onChange={(e) => setPhaseninfoRealisierung(e.target.value)}
                rows={2}
                className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                placeholder="Informationen zur Realisierungsphase"
              />
            </div>

            {/* Einführung Phase Info */}
            <div>
              <label htmlFor="phaseninfoEinfuehrung-short" className="block text-sm font-medium mb-1">
                Einführung
              </label>
              <textarea
                id="phaseninfoEinfuehrung-short"
                value={phaseninfoEinfuehrung}
                onChange={(e) => setPhaseninfoEinfuehrung(e.target.value)}
                rows={2}
                className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                placeholder="Informationen zur Einführungsphase"
              />
            </div>

            {/* Abschluss Phase Info */}
            <div>
              <label htmlFor="phaseninfoAbschluss-short" className="block text-sm font-medium mb-1">
                Abschluss
              </label>
              <textarea
                id="phaseninfoAbschluss-short"
                value={phaseninfoAbschluss}
                onChange={(e) => setPhaseninfoAbschluss(e.target.value)}
                rows={2}
                className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                placeholder="Informationen zur Abschlussphase"
              />
            </div>
          </div>

          {/* Bisher */}
          <div>
            <label htmlFor="bisher" className="block text-sm font-medium mb-1">
              Bisher <span className="text-red-500">*</span>
            </label>
            <textarea
              id="bisher"
              value={bisher}
              onChange={(e) => setBisher(e.target.value)}
              rows={3}
              className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-100 outline-none transition ${
                errors.bisher
                  ? 'border-rose-500 bg-slate-900/60'
                  : 'border-slate-800/70 bg-slate-950'
              } focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30`}
              placeholder="Was wurde bisher erreicht?"
              required
            />
            {errors.bisher && <p className="text-red-500 text-sm mt-1">{errors.bisher}</p>}
          </div>

          {/* Zukunft */}
          <div>
            <label htmlFor="zukunft" className="block text-sm font-medium mb-1">
              In Zukunft <span className="text-red-500">*</span>
            </label>
            <textarea
              id="zukunft"
              value={zukunft}
              onChange={(e) => setZukunft(e.target.value)}
              rows={3}
              className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-100 outline-none transition ${
                errors.zukunft
                  ? 'border-rose-500 bg-slate-900/60'
                  : 'border-slate-800/70 bg-slate-950'
              } focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30`}
              placeholder="Was ist für die Zukunft geplant?"
              required
            />
            {errors.zukunft && <p className="text-red-500 text-sm mt-1">{errors.zukunft}</p>}
          </div>

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
                Selected fields: {selectedFields.join(', ')}
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
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nach Benutzern suchen..."
                  className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                />
                {isSearching && (
                  <div className="absolute right-2 top-1.5">
                    <JSDoITLoader
                      sizeRem={0.7}
                      message=""
                      showGlow={false}
                      className="flex-row gap-1 px-0 py-0 text-sky-200"
                    />
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="absolute z-10 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-800/70 bg-slate-950/95 shadow-xl shadow-slate-950/40 backdrop-blur">
                    <ul>
                      {searchResults.map((user) => (
                        <li
                          key={user.id || user.name}
                          className="flex cursor-pointer items-center justify-between border-b border-slate-800/60 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-900/80 last:border-0"
                          onClick={() => handleAddTeamMember(user)}
                        >
                          <span>{user.name}</span>
                          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">
                            Hinzufügen
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

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
                      className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300 transition hover:text-sky-200"
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
        >
          {initialProject ? 'Aktualisieren' : 'Erstellen'}
        </button>
      </div>
    </form>
  );
};

export default ProjectForm;
