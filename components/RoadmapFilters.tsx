import React, { useState } from 'react';

type ProgressBucket = 'all' | 'not-started' | 'active' | 'almost-done' | 'completed';

interface RoadmapFiltersProps {
  filterText: string;
  onFilterTextChange: (v: string) => void;
  availableStatuses: string[];
  selectedStatuses: string[];
  onToggleStatus: (status: string) => void;
  availableBadges: string[];
  selectedBadges: string[];
  onToggleBadge: (badge: string) => void;
  availableTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  availableLeads: string[];
  selectedLeads: string[];
  onToggleLead: (lead: string) => void;
  availablePhases: string[];
  selectedPhases: string[];
  onTogglePhase: (phase: string) => void;
  selectedProjectTypes: string[];
  onToggleProjectType: (projectType: string) => void;
  progressBucket: ProgressBucket;
  onProgressBucketChange: (bucket: ProgressBucket) => void;
  selectedAttributes: string[];
  onToggleAttribute: (attribute: string) => void;
  resultCount: number;
  totalCount: number;
  onClearAll: () => void;
  monthRange: { start: number; end: number };
  onMonthRangeChange: (r: { start: number; end: number }) => void;
  onlyRunning: boolean;
  onToggleOnlyRunning: (v: boolean) => void;
  onSelectAllCategories?: () => void;
  onClearCategories?: () => void;
}

const statusLabels: Record<string, string> = {
  planned: 'Geplant',
  'in-progress': 'In Umsetzung',
  completed: 'Abgeschlossen',
  paused: 'Pausiert',
  cancelled: 'Gestoppt',
};

const phaseLabels: Record<string, string> = {
  initialisierung: 'Initialisierung',
  konzept: 'Konzept',
  realisierung: 'Realisierung',
  einfuehrung: 'Einführung',
  abschluss: 'Abschluss',
};

const projectTypeLabels: Record<string, string> = {
  short: 'Kurzzeitprojekt',
  long: 'Langzeitprojekt',
};

const progressLabels: Record<ProgressBucket, string> = {
  all: 'Alle',
  'not-started': 'Noch nicht gestartet',
  active: 'In Arbeit',
  'almost-done': 'Fast fertig',
  completed: 'Abgeschlossen',
};

const attributeLabels: Record<string, string> = {
  'with-team': 'Mit Team',
  'with-links': 'Mit Links',
  'with-owner': 'Mit Projektleitung',
  'with-milestone': 'Mit Meilenstein',
};

const pretty = (value: string) =>
  value.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const chipClass = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-medium transition ${
    active
      ? 'border-sky-400 bg-sky-500/20 text-sky-100'
      : 'border-white/10 bg-slate-950/70 text-slate-300 hover:border-slate-500 hover:bg-slate-900'
  }`;

const panelClass =
  'rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 shadow-inner shadow-slate-950/30';

const RoadmapFilters: React.FC<RoadmapFiltersProps> = ({
  filterText,
  onFilterTextChange,
  availableStatuses,
  selectedStatuses,
  onToggleStatus,
  availableBadges,
  selectedBadges,
  onToggleBadge,
  availableTags,
  selectedTags,
  onToggleTag,
  availableLeads,
  selectedLeads,
  onToggleLead,
  availablePhases,
  selectedPhases,
  onTogglePhase,
  selectedProjectTypes,
  onToggleProjectType,
  progressBucket,
  onProgressBucketChange,
  selectedAttributes,
  onToggleAttribute,
  resultCount,
  totalCount,
  onClearAll,
  monthRange,
  onMonthRangeChange,
  onlyRunning,
  onToggleOnlyRunning,
  onSelectAllCategories,
  onClearCategories,
}) => {
  const [open, setOpen] = useState<boolean>(false);

  const activeFilters = [
    ...(filterText
      ? [
          {
            key: `search:${filterText}`,
            label: `Suche: ${filterText}`,
            onRemove: () => onFilterTextChange(''),
          },
        ]
      : []),
    ...selectedStatuses.map((status) => ({
      key: `status:${status}`,
      label: statusLabels[status] || pretty(status),
      onRemove: () => onToggleStatus(status),
    })),
    ...selectedProjectTypes.map((projectType) => ({
      key: `type:${projectType}`,
      label: projectTypeLabels[projectType] || pretty(projectType),
      onRemove: () => onToggleProjectType(projectType),
    })),
    ...selectedPhases.map((phase) => ({
      key: `phase:${phase}`,
      label: phaseLabels[phase] || pretty(phase),
      onRemove: () => onTogglePhase(phase),
    })),
    ...(progressBucket !== 'all'
      ? [
          {
            key: `progress:${progressBucket}`,
            label: `Fortschritt: ${progressLabels[progressBucket]}`,
            onRemove: () => onProgressBucketChange('all'),
          },
        ]
      : []),
    ...selectedAttributes.map((attribute) => ({
      key: `attribute:${attribute}`,
      label: attributeLabels[attribute] || pretty(attribute),
      onRemove: () => onToggleAttribute(attribute),
    })),
    ...selectedLeads.map((lead) => ({
      key: `lead:${lead}`,
      label: lead,
      onRemove: () => onToggleLead(lead),
    })),
    ...selectedBadges.map((badge) => ({
      key: `badge:${badge}`,
      label: `Badge: ${badge}`,
      onRemove: () => onToggleBadge(badge),
    })),
    ...selectedTags.map((tag) => ({
      key: `tag:${tag}`,
      label: `Tag: ${tag}`,
      onRemove: () => onToggleTag(tag),
    })),
    ...(monthRange.start !== 1 || monthRange.end !== 12
      ? [
          {
            key: 'months',
            label: `Monate: ${monthRange.start}-${monthRange.end}`,
            onRemove: () => onMonthRangeChange({ start: 1, end: 12 }),
          },
        ]
      : []),
    ...(onlyRunning
      ? [
          {
            key: 'running',
            label: 'Nur laufende Projekte',
            onRemove: () => onToggleOnlyRunning(false),
          },
        ]
      : []),
  ];

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 px-4 py-4 shadow-lg shadow-slate-950/30 sm:px-5">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <svg
              className={`h-5 w-5 text-sky-200 transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-base font-semibold text-white md:text-lg">Erweiterte Filter</span>
            {activeFilters.length > 0 && (
              <span className="rounded-full border border-sky-400/30 bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-100">
                {activeFilters.length}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-300">
            Verfeinere die Timeline nach Inhalt, Badges, Verantwortlichkeit, Fortschritt und Datenlage.
          </p>
        </div>

        <div className="grid min-w-[140px] grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2">
            <div className="text-lg font-semibold text-white">{resultCount}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Treffer</div>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2">
            <div className="text-lg font-semibold text-white">{totalCount}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Im Jahr</div>
          </div>
        </div>
      </button>

      {activeFilters.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={filter.onRemove}
              className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-100 transition hover:bg-sky-500/20"
              title="Filter entfernen"
            >
              {filter.label} ×
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr_1fr]">
            <div className={panelClass}>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Suche
              </label>
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                placeholder="Titel, Beschreibung, Leitung, Meilenstein oder Team"
                value={filterText}
                onChange={(event) => onFilterTextChange(event.target.value)}
              />
              <p className="mt-2 text-xs text-slate-400">
                Die Suche prüft jetzt auch Projektleitung, Meilensteine, Tags und Teammitglieder.
              </p>
            </div>

            <div className={panelClass}>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Projektart
              </label>
              <div className="flex flex-wrap gap-2">
                {(['short', 'long'] as const).map((projectType) => (
                  <button
                    key={projectType}
                    type="button"
                    onClick={() => onToggleProjectType(projectType)}
                    className={chipClass(selectedProjectTypes.includes(projectType))}
                  >
                    {projectTypeLabels[projectType]}
                  </button>
                ))}
              </div>

              <label className="mb-2 mt-4 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Fortschritt
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['all', 'not-started', 'active', 'almost-done', 'completed'] as const).map(
                  (bucket) => (
                    <button
                      key={bucket}
                      type="button"
                      onClick={() => onProgressBucketChange(bucket)}
                      className={chipClass(progressBucket === bucket)}
                    >
                      {progressLabels[bucket]}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className={panelClass}>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Struktur
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(attributeLabels).map((attribute) => (
                  <button
                    key={attribute}
                    type="button"
                    onClick={() => onToggleAttribute(attribute)}
                    className={chipClass(selectedAttributes.includes(attribute))}
                  >
                    {attributeLabels[attribute]}
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3">
                <label className="flex items-center gap-3 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={onlyRunning}
                    onChange={(event) => onToggleOnlyRunning(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-500"
                  />
                  Nur laufende Projekte anzeigen
                </label>
                <p className="mt-2 text-xs text-slate-400">
                  Zeigt nur Projekte mit Start ≤ heute ≤ Ende.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr]">
            <div className={panelClass}>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {availableStatuses.length === 0 ? (
                  <span className="text-xs text-slate-500">Keine Statuswerte vorhanden</span>
                ) : (
                  availableStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => onToggleStatus(status)}
                      className={chipClass(selectedStatuses.includes(status))}
                    >
                      {statusLabels[status] || pretty(status)}
                    </button>
                  ))
                )}
              </div>

              <label className="mb-2 mt-4 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Projektphase
              </label>
              <div className="flex flex-wrap gap-2">
                {availablePhases.length === 0 ? (
                  <span className="text-xs text-slate-500">Keine Phasenwerte vorhanden</span>
                ) : (
                  availablePhases.map((phase) => (
                    <button
                      key={phase}
                      type="button"
                      onClick={() => onTogglePhase(phase)}
                      className={chipClass(selectedPhases.includes(phase))}
                    >
                      {phaseLabels[phase] || pretty(phase)}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className={panelClass}>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Projektleitung
              </label>
              <div className="max-h-48 overflow-auto pr-1">
                <div className="flex flex-wrap gap-2">
                  {availableLeads.length === 0 ? (
                    <span className="text-xs text-slate-500">Keine Projektleitungen vorhanden</span>
                  ) : (
                    availableLeads.map((lead) => (
                      <button
                        key={lead}
                        type="button"
                        onClick={() => onToggleLead(lead)}
                        className={chipClass(selectedLeads.includes(lead))}
                        title={lead}
                      >
                        {lead}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className={panelClass}>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Zeitraum, Badges und Tags
              </label>
              <div className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3">
                <div className="mb-3 flex items-center gap-2 text-xs text-slate-300">
                  <span>Von</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={monthRange.start}
                    onChange={(event) =>
                      onMonthRangeChange({
                        start: Math.min(
                          Math.max(1, Number(event.target.value) || 1),
                          monthRange.end
                        ),
                        end: monthRange.end,
                      })
                    }
                    className="w-14 rounded-md border border-slate-700 bg-slate-900 px-2 py-1"
                  />
                  <span>bis</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={monthRange.end}
                    onChange={(event) =>
                      onMonthRangeChange({
                        start: monthRange.start,
                        end: Math.max(
                          Math.min(12, Number(event.target.value) || 12),
                          monthRange.start
                        ),
                      })
                    }
                    className="w-14 rounded-md border border-slate-700 bg-slate-900 px-2 py-1"
                  />
                  <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200">
                    {monthRange.start}-{monthRange.end}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={monthRange.start}
                    onChange={(event) =>
                      onMonthRangeChange({
                        start: Math.min(Number(event.target.value) || 1, monthRange.end),
                        end: monthRange.end,
                      })
                    }
                    className="w-full accent-sky-500"
                  />
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={monthRange.end}
                    onChange={(event) =>
                      onMonthRangeChange({
                        start: monthRange.start,
                        end: Math.max(Number(event.target.value) || 12, monthRange.start),
                      })
                    }
                    className="w-full accent-sky-500"
                  />
                </div>
              </div>

              <div className="mt-4 max-h-36 overflow-auto pr-1">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Badges
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableBadges.length === 0 ? (
                    <span className="text-xs text-slate-500">Keine Badges vorhanden</span>
                  ) : (
                    availableBadges.map((badge) => (
                      <button
                        key={badge}
                        type="button"
                        onClick={() => onToggleBadge(badge)}
                        className={chipClass(selectedBadges.includes(badge))}
                        title={badge}
                      >
                        {badge}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4 max-h-40 overflow-auto pr-1">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Tags
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableTags.length === 0 ? (
                    <span className="text-xs text-slate-500">Keine Tags vorhanden</span>
                  ) : (
                    availableTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => onToggleTag(tag)}
                        className={chipClass(selectedTags.includes(tag))}
                        title={tag}
                      >
                        {tag}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/50 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {resultCount} von {totalCount} Projekten sichtbar
              </span>
              {onSelectAllCategories && (
                <button
                  type="button"
                  onClick={onSelectAllCategories}
                  className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Alle Kategorien
                </button>
              )}
              {onClearCategories && (
                <button
                  type="button"
                  onClick={onClearCategories}
                  className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Kategorien leeren
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClearAll}
              className="rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20"
            >
              Alle Filter zurücksetzen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoadmapFilters;
