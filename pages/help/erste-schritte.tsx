import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  FiArrowRight,
  FiBookOpen,
  FiCompass,
  FiEye,
  FiFilter,
  FiGrid,
  FiLayers,
  FiMousePointer,
  FiSearch,
} from 'react-icons/fi';
import CategorySidebar from '@/components/CategorySidebar';
import ColorModeToggle from '@/components/ColorModeToggle';
import CompactProjectCard from '@/components/CompactProjectCard';
import RoadmapFilters from '@/components/RoadmapFilters';
import RoadmapYearNavigation from '@/components/RoadmapYearNavigation';
import { ADMIN_SESSION_CHANGED_EVENT, getAdminSessionToken } from '@/utils/auth';
import type { Category, Project } from '@/types';

type Step = {
  title: string;
  description: string;
  details: string[];
  icon: typeof FiBookOpen;
};

const learningGoals = [
  'Die wichtigsten Elemente der Benutzeroberfläche kennen.',
  'Projekte gezielt finden, filtern und vergleichen.',
  'Projekt-Details nutzen, um Abläufe und Zuständigkeiten zu verstehen.',
  'Zwischen Ansichten wechseln und eigene Favoriten merken.',
];

const screenshotMarkers = {
  overview: [
    {
      number: '1',
      title: 'Roadmap-Kopf',
      description: 'Titel, Jahr und Projektzahl entsprechen dem Kopfbereich der echten Roadmap.',
    },
    {
      number: '2',
      title: 'Ansichten & Jahr',
      description: 'Zeitstrahl, Kacheln, Skalen und Jahresnavigation nutzen dieselben Controls.',
    },
    {
      number: '3',
      title: 'Zeitstrahl',
      description: 'Kategorien, Quartale und Projektbalken sind wie auf /roadmap aufgebaut.',
    },
  ],
  filters: [
    {
      number: '1',
      title: 'Erweiterte Filter',
      description: 'Der Filterblock ist die echte Roadmap-Filterkomponente im Standardzustand.',
    },
    {
      number: '2',
      title: 'Bereiche',
      description: 'Die Seitenleiste verwendet dieselbe Kategorie-Komponente wie die Roadmap.',
    },
    {
      number: '3',
      title: 'Kachelansicht',
      description: 'Die Projektkarten sind die echten kompakten Roadmap-Karten.',
    },
  ],
};

const mockCategories: Category[] = [
  {
    id: 'digital-workplace',
    name: 'Digital Workplace',
    color: '#20d6ff',
    icon: 'FiMonitor',
  },
  {
    id: 'daten-analyse',
    name: 'Daten & Analyse',
    color: '#37f2d0',
    icon: 'FiBarChart2',
  },
  {
    id: 'sicherheit',
    name: 'Sicherheit',
    color: '#ffcc66',
    icon: 'FiShield',
  },
];

const mockProjects: Project[] = [
  {
    id: 'mock-modern-workplace',
    title: 'Modern Workplace Rollout',
    projectType: 'long',
    category: 'digital-workplace',
    startQuarter: 'Q1',
    endQuarter: 'Q3',
    description: 'Pilot, Schulung und Rollout der modernen Arbeitsumgebung.',
    status: 'in-progress',
    ProjectFields: ['Arbeitsplatz', 'Rollout'],
    badges: ['Pilot'],
    projektleitung: 'Lea Demo',
    teamMembers: [{ id: 'tm-1', name: 'Mara Demo', role: 'Change' }],
    bisher: '',
    zukunft: '',
    fortschritt: 68,
    geplante_umsetzung: '2026',
    budget: '120000',
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-09-30T23:59:59.000Z',
    links: [{ id: 'lnk-1', title: 'Pilotkonzept', url: 'https://example.invalid/pilot' }],
    projektphase: 'realisierung',
    naechster_meilenstein: 'Pilotabschluss',
  },
  {
    id: 'mock-service-portal',
    title: 'Service Portal',
    projectType: 'long',
    category: 'digital-workplace',
    startQuarter: 'Q2',
    endQuarter: 'Q4',
    description: 'Zentraler Einstieg für Supportanfragen und interne Services.',
    status: 'planned',
    ProjectFields: ['Service', 'Portal'],
    badges: ['Strategisch'],
    projektleitung: 'Noel Demo',
    teamMembers: [{ id: 'tm-2', name: 'Nina Demo', role: 'Product Owner' }],
    bisher: '',
    zukunft: '',
    fortschritt: 20,
    geplante_umsetzung: '2026',
    budget: '90000',
    startDate: '2026-04-01T00:00:00.000Z',
    endDate: '2026-12-31T23:59:59.000Z',
    links: [{ id: 'lnk-2', title: 'Backlog', url: 'https://example.invalid/backlog' }],
    projektphase: 'konzept',
    naechster_meilenstein: 'MVP Scope',
  },
  {
    id: 'mock-data-quality',
    title: 'Datenqualität Cockpit',
    projectType: 'short',
    category: 'daten-analyse',
    startQuarter: 'Q1',
    endQuarter: 'Q2',
    description: 'Kennzahlen und Datenqualität für Steuerungsgremien sichtbar machen.',
    status: 'completed',
    ProjectFields: ['Reporting', 'Daten'],
    badges: ['Quick Win'],
    projektleitung: 'Eva Demo',
    teamMembers: [{ id: 'tm-3', name: 'Sam Demo', role: 'Data Engineer' }],
    bisher: '',
    zukunft: '',
    fortschritt: 100,
    geplante_umsetzung: '2026',
    budget: '45000',
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-06-30T23:59:59.000Z',
    links: [{ id: 'lnk-3', title: 'Dashboard', url: 'https://example.invalid/dashboard' }],
    projektphase: 'abschluss',
    naechster_meilenstein: 'Abnahme',
  },
];

const noop = () => undefined;

const RoadmapMockFilters = () => (
  <RoadmapFilters
    filterText=""
    onFilterTextChange={noop}
    availableStatuses={['planned', 'in-progress', 'completed']}
    selectedStatuses={[]}
    onToggleStatus={noop}
    availableBadges={['Pilot', 'Strategisch', 'Quick Win']}
    selectedBadges={[]}
    onToggleBadge={noop}
    availableTags={['Rollout', 'Reporting', 'Service']}
    selectedTags={[]}
    onToggleTag={noop}
    availableLeads={['Lea Demo', 'Noel Demo', 'Eva Demo']}
    selectedLeads={[]}
    onToggleLead={noop}
    availablePhases={['konzept', 'realisierung', 'abschluss']}
    selectedPhases={[]}
    onTogglePhase={noop}
    selectedProjectTypes={[]}
    onToggleProjectType={noop}
    progressBucket="all"
    onProgressBucketChange={noop}
    selectedAttributes={[]}
    onToggleAttribute={noop}
    resultCount={mockProjects.length}
    totalCount={mockProjects.length}
    onClearAll={noop}
    monthRange={{ start: 1, end: 12 }}
    onMonthRangeChange={noop}
    onlyRunning={false}
    onToggleOnlyRunning={noop}
    onSelectAllCategories={noop}
    onClearCategories={noop}
  />
);

const RoadmapMockHero = () => (
  <div className="ds-card ds-roadmap-hero-card">
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">
          Roadmap 2026
        </p>
        <h1
          className="text-3xl font-semibold text-white sm:text-4xl"
          style={{
            backgroundImage: 'linear-gradient(to right, #eab308, #b45309)',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}
        >
          IT + Digital Roadmap
        </h1>
        <p className="text-sm text-slate-300 sm:text-base">
          Filtere Projekte nach Status, Kategorien und Zeiträumen, um Fortschritt und Prioritäten
          auf einen Blick sichtbar zu machen.
        </p>
      </div>
      <div className="grid w-full gap-3 text-xs text-slate-300 sm:w-auto sm:text-sm md:grid-cols-2">
        <div className="ds-roadmap-stat-card rounded-2xl border px-4 py-3 text-center">
          <span className="block text-2xl font-semibold text-white">3</span>
          <span>Projekte sichtbar</span>
        </div>
      </div>
    </div>
  </div>
);

const RoadmapMockToolbar = ({ viewMode }: { viewMode: 'timeline' | 'tiles' }) => (
  <div className="ds-card ds-roadmap-toolbar">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:gap-3">
        <div className="ds-roadmap-segmented">
          <button
            className={`ds-roadmap-segment ${viewMode === 'timeline' ? 'is-active' : ''}`}
            type="button"
            title="Zeitstrahl"
          >
            Zeitstrahl
          </button>
          <button
            className={`ds-roadmap-segment ${viewMode === 'tiles' ? 'is-active' : ''}`}
            type="button"
            title="Kachelansicht"
          >
            Kacheln
          </button>
        </div>
        <button className="ds-roadmap-scale-button is-active" type="button">
          Quartale
        </button>
        <button className="ds-roadmap-scale-button" type="button">
          Monate
        </button>
        <button className="ds-roadmap-scale-button" type="button">
          Wochen
        </button>
        <button className="ds-roadmap-scale-button" type="button">
          Jahre
        </button>
      </div>

      <div className="flex w-full flex-wrap items-center justify-center gap-4 md:justify-end">
        <RoadmapYearNavigation initialYear={2026} onYearChange={noop} />
      </div>
    </div>
  </div>
);

const RoadmapMockSidebar = () => (
  <CategorySidebar
    categories={mockCategories}
    activeCategories={mockCategories.map((category) => category.id)}
    onToggleCategory={noop}
  />
);

const RoadmapMockTimeGrid = () => (
  <div className="ds-roadmap-time-grid is-quarters">
    {[
      ['Q1 2026', 'linear-gradient(to right, #eab308, #d97706)'],
      ['Q2 2026', 'linear-gradient(to right, #d97706, #ea580c)'],
      ['Q3 2026', 'linear-gradient(to right, #ea580c, #c2410c)'],
      ['Q4 2026', 'linear-gradient(to right, #c2410c, #b91c1c)'],
    ].map(([label, background]) => (
      <div
        key={label}
        className="roadmap-time-header p-2 md:p-3 rounded-lg text-center font-semibold text-xs md:text-sm"
        style={{ background }}
      >
        {label}
      </div>
    ))}
  </div>
);

const RoadmapMockTimelineRows = () => (
  <div className="ds-roadmap-category-stack relative">
    <div className="ds-roadmap-category-section">
      <div className="mb-2 flex items-center gap-3 md:mb-3">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: mockCategories[0].color }}
        />
        <h2 className="text-lg md:text-xl font-semibold m-0">Digital Workplace</h2>
        <span className="roadmap-project-count-badge ml-2 text-xs md:text-sm px-2 py-0.5 rounded-full bg-slate-800/80 border border-white/10 text-slate-200">
          2 Projekte
        </span>
      </div>

      <div className="space-y-2 md:space-y-4">
        {[
          {
            title: 'Modern Workplace Rollout',
            left: '0%',
            width: '68%',
            color: mockCategories[0].color,
          },
          { title: 'Service Portal', left: '32%', width: '64%', color: '#37f2d0' },
        ].map((project) => (
          <div key={project.title} className="relative mb-1 h-6 md:mb-2 md:h-8">
            <div className="absolute top-0 left-0 right-0 h-full pointer-events-none">
              <div className="grid grid-cols-4 gap-2 md:gap-4 h-full">
                <div className="bg-slate-800 rounded-lg opacity-30" />
                <div className="bg-slate-800 rounded-lg opacity-30" />
                <div className="bg-slate-800 rounded-lg opacity-30" />
                <div className="bg-slate-800 rounded-lg opacity-30" />
              </div>
            </div>

            <div
              className="roadmap-project-bar absolute top-0 h-full rounded-lg flex items-center px-1 md:px-3 transition-all hover:brightness-110 group border border-white border-opacity-30 hover:border-opacity-70 cursor-pointer"
              style={{
                left: project.left,
                width: project.width,
                backgroundColor: project.color,
                opacity: 0.85,
              }}
            >
              <div className="flex items-center gap-1 w-full overflow-hidden">
                <span className="roadmap-project-label font-medium truncate px-1 md:px-2 py-0.5 rounded bg-black bg-opacity-40 text-white group-hover:bg-opacity-60 text-[10px] md:text-sm flex-shrink">
                  {project.title}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const RoadmapMockTiles = () => (
  <div className="ds-roadmap-category-stack">
    <div className="ds-roadmap-category-section">
      <div className="mb-3 flex items-center gap-3">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: mockCategories[0].color }}
        />
        <h2 className="text-lg md:text-xl font-semibold m-0">Digital Workplace</h2>
        <span className="roadmap-project-count-badge ml-2 text-xs md:text-sm px-2 py-0.5 rounded-full bg-slate-800/80 border border-white/10 text-slate-200">
          3 Projekte
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {mockProjects.map((project) => {
          const category =
            mockCategories.find((entry) => entry.id === project.category) || mockCategories[0];
          return (
            <CompactProjectCard
              key={project.id}
              project={project}
              categoryName={category.name}
              categoryColor={category.color}
              onClick={noop}
            />
          );
        })}
      </div>
    </div>
  </div>
);

const steps: Step[] = [
  {
    title: 'Startseite verstehen',
    description:
      'Die Roadmap zeigt Projekte als Zeitleiste oder Kacheln. Farbige Balken stehen für Kategorien und sorgen für Orientierung.',
    details: [
      'Kategorie-Farben spiegeln Verantwortungsbereiche wider.',
      'Ein Verlauf weist auf priorisierte Initiativen hin.',
    ],
    icon: FiEye,
  },
  {
    title: 'Filtern und suchen',
    description:
      'Über der Roadmap finden Sie Textsuche, Status-Filter sowie die Auswahl von Kategorien oder Monaten.',
    details: [
      'Nutzen Sie die Suche für Projektnamen, Stichworte oder Verantwortliche.',
      'Aktivieren Sie "Nur laufende Projekte", um aktuell aktive Initiativen einzublenden.',
    ],
    icon: FiSearch,
  },
  {
    title: 'Details anzeigen',
    description:
      'Ein Klick auf ein Projekt öffnet ein Panel mit Beschreibung, Meilensteinen, Ansprechpersonen und Links.',
    details: [
      'Das Panel lässt sich mit der Escape-Taste oder dem Schließen-Button beenden.',
      'Links führen direkt zu SharePoint-Dokumenten oder zusätzlichen Ressourcen.',
    ],
    icon: FiMousePointer,
  },
  {
    title: 'Ansicht wechseln',
    description:
      'Über die Buttons "Zeitstrahl" und "Kacheln" entscheiden Sie, ob die Jahresplanung oder verdichtete Karten angezeigt werden.',
    details: [
      'Zeitstrahl: ideal für Langfristplanung und Abhängigkeiten.',
      'Kacheln: kompakter Überblick, perfekt für Sitzungen oder mobile Geräte.',
    ],
    icon: FiGrid,
  },
];

const ErsteSchritte = () => {
  const [showFeedbackLink, setShowFeedbackLink] = useState(false);

  useEffect(() => {
    const updateFeedbackLink = () => setShowFeedbackLink(Boolean(getAdminSessionToken()));
    updateFeedbackLink();
    window.addEventListener(ADMIN_SESSION_CHANGED_EVENT, updateFeedbackLink);
    return () => window.removeEventListener(ADMIN_SESSION_CHANGED_EVENT, updateFeedbackLink);
  }, []);

  return (
    <>
      <Head>
        <title>Erste Schritte | JSDoIT Roadmap</title>
      </Head>
      <div className="ds-page-shell">
        <header className="ds-topbar">
          <Link className="ds-brand" href="/landing">
            <span className="ds-brand-mark">JS</span>
            <span className="ds-brand-name">JSDOIT Roadmap Center</span>
          </Link>

          <nav className="ds-nav" aria-label="Hauptnavigation">
            <Link className="ds-nav-link" href="/landing">
              Start
            </Link>
            <Link className="ds-nav-link" href="/instances">
              Instanzübersicht
            </Link>
            <Link className="ds-nav-link is-active" href="/help">
              Hilfe
            </Link>
            {showFeedbackLink && (
              <Link className="ds-nav-link" href="/feedback">
                Feedback
              </Link>
            )}
          </nav>

          <ColorModeToggle className="ds-color-mode-toggle" />
        </header>

        <main className="ds-page-main">
          <section className="ds-container ds-hero ds-help-hero">
            <div className="ds-hero-content">
              <div className="ds-badge-row">
                <Link className="ds-badge" href="/help">
                  Hilfe
                </Link>
                <span className="ds-badge ds-badge-success">Erste Schritte</span>
              </div>

              <div className="ds-eyebrow">
                <FiCompass className="ds-icon-sm" />
                Schnellstart
              </div>
              <h1 className="ds-hero-title">Erste Schritte mit der Roadmap.</h1>
              <p className="ds-hero-copy">
                Diese Einführung führt Sie in weniger als fünf Minuten durch die wichtigsten
                Funktionen. Folgen Sie den vier Schritten und testen Sie die Roadmap parallel in
                einem zweiten Tab.
              </p>

              <div className="ds-actions">
                <Link className="ds-button ds-button-primary" href="/roadmap">
                  Roadmap öffnen
                  <FiArrowRight className="ds-icon-sm" />
                </Link>
                <Link className="ds-button ds-button-secondary" href="/help/faq">
                  FAQ öffnen
                </Link>
              </div>
            </div>

            <aside className="ds-card ds-logic-panel" aria-label="Was Sie lernen">
              <div className="ds-panel-header">
                <div>
                  <p className="ds-panel-label">Was Sie lernen</p>
                  <h2 className="ds-panel-title">Ein schneller Überblick für den Alltag</h2>
                </div>
                <div className="ds-panel-icon" aria-hidden="true">
                  <FiBookOpen className="ds-icon-md" />
                </div>
              </div>

              <div className="ds-info-list">
                {learningGoals.map((goal) => (
                  <p key={goal} className="ds-info-item">
                    {goal}
                  </p>
                ))}
              </div>
            </aside>
          </section>

          <section className="ds-container ds-section ds-help-knowledge-section">
            <div className="ds-section-header">
              <div>
                <p className="ds-panel-label">Screenshots & Markierungen</p>
                <h2 className="ds-section-title">Die Oberfläche auf einen Blick</h2>
              </div>
              <p className="ds-section-copy">
                Die folgenden Ausschnitte zeigen, wo Sie sich orientieren, filtern und zwischen
                Ansichten wechseln. Die Nummern finden Sie direkt neben den Erklärungen wieder.
              </p>
            </div>

            <div className="ds-screenshot-grid">
              <article className="ds-card ds-screenshot-card ds-roadmap-screenshot-card">
                <div
                  className="ds-screenshot-frame ds-roadmap-screenshot-frame"
                  aria-label="Annotierter Screenshot der Roadmap-Übersicht"
                >
                  <div className="ds-roadmap-mockup ds-roadmap-shell">
                    <RoadmapMockHero />
                    <RoadmapMockToolbar viewMode="timeline" />
                    <div className="ds-roadmap-layout relative">
                      <div className="ds-roadmap-sidebar">
                        <RoadmapMockSidebar />
                      </div>
                      <div className="ds-roadmap-content">
                        <div
                          className="ds-roadmap-scroll"
                          style={{ WebkitOverflowScrolling: 'touch' }}
                        >
                          <div className="ds-roadmap-canvas">
                            <div className="ds-roadmap-filter-slot">
                              <RoadmapMockFilters />
                            </div>
                            <RoadmapMockTimeGrid />
                            <RoadmapMockTimelineRows />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className="ds-screenshot-marker" style={{ left: '7%', top: '13%' }}>
                    1
                  </span>
                  <span className="ds-screenshot-marker" style={{ left: '55%', top: '30%' }}>
                    2
                  </span>
                  <span className="ds-screenshot-marker" style={{ left: '72%', top: '72%' }}>
                    3
                  </span>
                </div>
                <div className="ds-screenshot-notes">
                  {screenshotMarkers.overview.map((marker) => (
                    <div key={marker.number} className="ds-screenshot-note">
                      <span>{marker.number}</span>
                      <div>
                        <h3>{marker.title}</h3>
                        <p>{marker.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="ds-card ds-screenshot-card ds-roadmap-screenshot-card">
                <div
                  className="ds-screenshot-frame ds-roadmap-screenshot-frame"
                  aria-label="Annotierter Screenshot der Filter und Ansichten"
                >
                  <div className="ds-roadmap-mockup ds-roadmap-shell">
                    <RoadmapMockToolbar viewMode="tiles" />
                    <div className="ds-roadmap-layout relative">
                      <div className="ds-roadmap-sidebar">
                        <RoadmapMockSidebar />
                      </div>
                      <div className="ds-roadmap-content">
                        <div
                          className="ds-roadmap-scroll"
                          style={{ WebkitOverflowScrolling: 'touch' }}
                        >
                          <div className="ds-roadmap-canvas">
                            <div className="ds-roadmap-filter-slot">
                              <RoadmapMockFilters />
                            </div>
                            <div className="mb-6" />
                            <RoadmapMockTiles />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className="ds-screenshot-marker" style={{ left: '43%', top: '36%' }}>
                    1
                  </span>
                  <span className="ds-screenshot-marker" style={{ left: '9%', top: '43%' }}>
                    2
                  </span>
                  <span className="ds-screenshot-marker" style={{ left: '74%', top: '69%' }}>
                    3
                  </span>
                </div>
                <div className="ds-screenshot-notes">
                  {screenshotMarkers.filters.map((marker) => (
                    <div key={marker.number} className="ds-screenshot-note">
                      <span>{marker.number}</span>
                      <div>
                        <h3>{marker.title}</h3>
                        <p>{marker.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>

          <section className="ds-container ds-section">
            <div className="ds-section-header">
              <div>
                <p className="ds-panel-label">Schritt für Schritt</p>
                <h2 className="ds-section-title">Vom Überblick zur passenden Ansicht</h2>
              </div>
              <p className="ds-section-copy">
                Jeder Schritt fokussiert eine konkrete Aktion in der Roadmap: erst orientieren, dann
                suchen, Details prüfen und die beste Darstellung wählen.
              </p>
            </div>

            <div className="ds-steps">
              {steps.map((step, index) => (
                <article key={step.title} className="ds-step">
                  <span className="ds-step-number">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <div className="ds-help-card-header">
                      <div>
                        <h3 className="ds-step-title">{step.title}</h3>
                        <p className="ds-step-copy">{step.description}</p>
                      </div>
                      <div className="ds-help-card-icon" aria-hidden="true">
                        <step.icon className="ds-icon-sm" />
                      </div>
                    </div>
                    <div className="ds-info-list">
                      {step.details.map((detail) => (
                        <p key={detail} className="ds-info-item">
                          {detail}
                        </p>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="ds-container ds-section ds-help-knowledge-section">
            <div className="ds-card ds-help-support-panel">
              <div>
                <p className="ds-panel-label">Nächste Schritte</p>
                <h2 className="ds-section-title">Jetzt gezielt vertiefen</h2>
                <p className="ds-section-copy">
                  Die Grundlagen sitzen? Dann empfehlen wir, die Filter tiefer kennenzulernen oder
                  eigene Projekte zu melden. Alle weiterführenden Artikel finden Sie in der
                  Hilfe-Übersicht.
                </p>
              </div>
              <div className="ds-help-list">
                <Link className="ds-help-list-item" href="/help/projekte-ansehen">
                  <div className="ds-help-list-icon">
                    <FiFilter className="ds-icon-sm" />
                  </div>
                  <div>
                    <h3>Projekte filtern und vergleichen</h3>
                    <p>Suchfeld, Filter und Ansichten im Detail nutzen.</p>
                  </div>
                  <FiArrowRight className="ds-icon-sm" />
                </Link>
                <Link className="ds-help-list-item" href="/help/projekte-melden">
                  <div className="ds-help-list-icon">
                    <FiLayers className="ds-icon-sm" />
                  </div>
                  <div>
                    <h3>Informationen an das Roadmap-Team schicken</h3>
                    <p>Neue Vorhaben oder Ergänzungen strukturiert vorbereiten.</p>
                  </div>
                  <FiArrowRight className="ds-icon-sm" />
                </Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="ds-footer">
          <div className="ds-container ds-footer-inner">
            <span>JSDoIT Roadmap Center</span>
            <div className="ds-footer-links">
              <Link className="ds-footer-link" href="/help">
                Hilfe
              </Link>
              <Link className="ds-footer-link" href="/help/faq">
                FAQ
              </Link>
              <Link className="ds-footer-link" href="/instances">
                Instanzen
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default ErsteSchritte;
