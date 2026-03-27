import type { Category, Project } from '@/types';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

const currentYear = new Date().getFullYear();

const toIso = (month: number, day: number, end = false) =>
  new Date(
    Date.UTC(currentYear, month, day, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0)
  ).toISOString();

const SAMPLE_CATEGORIES: Category[] = [
  {
    id: 'sample-digital-workplace',
    name: 'Digital Workplace',
    color: '#0f766e',
    icon: 'FaLaptopHouse',
  },
  {
    id: 'sample-customer-service',
    name: 'Service Portal',
    color: '#2563eb',
    icon: 'FaHeadset',
  },
  {
    id: 'sample-data-analytics',
    name: 'Data & Analytics',
    color: '#7c3aed',
    icon: 'FaChartLine',
  },
  {
    id: 'sample-security',
    name: 'Security & Governance',
    color: '#dc2626',
    icon: 'FaShieldAlt',
  },
  {
    id: 'sample-innovation',
    name: 'Innovation Lab',
    color: '#ea580c',
    icon: 'FaLightbulb',
  },
];

const SAMPLE_PROJECTS: Project[] = [
  {
    id: 'sample-modern-workplace',
    title: 'Modern Workplace Rollout',
    projectType: 'long',
    category: 'sample-digital-workplace',
    startQuarter: 'Q1',
    endQuarter: 'Q4',
    description:
      'Einführung eines modernen Arbeitsplatzes mit Teams-Telefonie, Gerätestandardisierung und kollaborativen Vorlagen.',
    status: 'in-progress',
    ProjectFields: ['M365', 'Adoption', 'Collaboration'],
    projektleitung: 'Nora Beispiel',
    teamMembers: [
      { id: 'tm-1', name: 'Luca Muster', role: 'Change Management' },
      { id: 'tm-2', name: 'Mara Beispiel', role: 'Workplace Engineer' },
    ],
    bisher: 'Tenant vorbereitet, Pilotgruppen definiert und Schulungsunterlagen erstellt.',
    zukunft: 'Rollout auf weitere Ämter und Automatisierung der Gerätebereitstellung.',
    fortschritt: 62,
    geplante_umsetzung: 'Pilotbetrieb bis Ende Sommer, Vollausbau im Herbst.',
    budget: '120000',
    startDate: toIso(0, 15),
    endDate: toIso(10, 30, true),
    links: [
      { id: 'lnk-1', title: 'Pilotkonzept', url: 'https://example.invalid/sample/pilotkonzept' },
      { id: 'lnk-2', title: 'Schulungsplan', url: 'https://example.invalid/sample/schulungsplan' },
    ],
    projektphase: 'realisierung',
    naechster_meilenstein: 'Pilot-Freigabe für die erste Dienststelle',
  },
  {
    id: 'sample-service-portal',
    title: 'Service Portal Relaunch',
    projectType: 'short',
    category: 'sample-customer-service',
    startQuarter: 'Q2',
    endQuarter: 'Q3',
    description:
      'Neues Self-Service-Portal mit vereinfachten Formularen, Statusverfolgung und responsiver Oberfläche.',
    status: 'planned',
    ProjectFields: ['Self Service', 'UX', 'Forms'],
    projektleitung: 'Lea Demo',
    teamMembers: [{ id: 'tm-3', name: 'Jan Beispiel', role: 'UX Lead' }],
    bisher: 'Anforderungen mit Fachbereichen priorisiert.',
    zukunft: 'Umsetzung des MVP und Integration in bestehende Identitätsprozesse.',
    fortschritt: 18,
    geplante_umsetzung: 'MVP innerhalb von zwei Quartalen.',
    budget: '45000',
    startDate: toIso(3, 8),
    endDate: toIso(8, 20, true),
    links: [{ id: 'lnk-3', title: 'Backlog', url: 'https://example.invalid/sample/backlog' }],
    projektphase: 'konzept',
    naechster_meilenstein: 'Abnahme UX-Prototyp',
  },
  {
    id: 'sample-data-platform',
    title: 'Data Platform Foundation',
    projectType: 'long',
    category: 'sample-data-analytics',
    startQuarter: 'Q1',
    endQuarter: 'Q2',
    description:
      'Aufbau einer wiederverwendbaren Datenplattform inklusive Datenkatalog, Governance und Standard-ETL-Strecken.',
    status: 'completed',
    ProjectFields: ['Data Governance', 'ETL', 'Reporting'],
    projektleitung: 'Sven Beispiel',
    teamMembers: [
      { id: 'tm-4', name: 'Eva Demo', role: 'Data Engineer' },
      { id: 'tm-5', name: 'Mika Test', role: 'BI Architect' },
    ],
    bisher: 'Plattform aufgebaut und erste Datenprodukte produktiv gesetzt.',
    zukunft: 'Nächste Ausbaustufe als separates Folgevorhaben.',
    fortschritt: 100,
    geplante_umsetzung: 'Basisplattform produktiv abgeschlossen.',
    budget: '98000',
    startDate: toIso(0, 5),
    endDate: toIso(5, 28, true),
    links: [
      {
        id: 'lnk-4',
        title: 'Architekturübersicht',
        url: 'https://example.invalid/sample/architektur',
      },
    ],
    projektphase: 'abschluss',
    naechster_meilenstein: 'Betriebsübergabe abgeschlossen',
  },
  {
    id: 'sample-security-awareness',
    title: 'Security Awareness Sprint',
    projectType: 'short',
    category: 'sample-security',
    startQuarter: 'Q3',
    endQuarter: 'Q4',
    description:
      'Sensibilisierungskampagne mit Phishing-Simulationen, Kurzschulungen und neuen Sicherheitsrichtlinien.',
    status: 'paused',
    ProjectFields: ['Awareness', 'Policy', 'Training'],
    projektleitung: 'Tina Muster',
    teamMembers: [],
    bisher: 'Kampagnenformat definiert und Kommunikationsplan vorbereitet.',
    zukunft: 'Fortsetzung nach Freigabe der finalen Policy.',
    fortschritt: 34,
    geplante_umsetzung: 'Wiederaufnahme nach Policy-Freigabe.',
    budget: '15000',
    startDate: toIso(6, 1),
    endDate: toIso(11, 10, true),
    links: [],
    projektphase: 'initialisierung',
    naechster_meilenstein: 'Policy Board Entscheid',
  },
  {
    id: 'sample-ai-assistant',
    title: 'AI Assistant Pilot',
    projectType: 'short',
    category: 'sample-innovation',
    startQuarter: 'Q2',
    endQuarter: 'Q4',
    description:
      'Pilot für interne KI-Assistenten mit abgesicherten Prompt-Vorlagen und Governance-Framework.',
    status: 'in-progress',
    ProjectFields: ['AI', 'Pilot', 'Governance'],
    projektleitung: 'Mila Beispiel',
    teamMembers: [
      { id: 'tm-6', name: 'Noel Demo', role: 'Product Owner' },
      { id: 'tm-7', name: 'Sara Test', role: 'Compliance' },
    ],
    bisher: 'Use Cases ausgewählt und Pilotnutzer onboardet.',
    zukunft: 'Auswertung des Piloten und Entscheid für Skalierung.',
    fortschritt: 78,
    geplante_umsetzung: 'Pilot bis Jahresende mit Entscheidungsgrundlage.',
    budget: '30000',
    startDate: toIso(4, 2),
    endDate: toIso(11, 15, true),
    links: [
      { id: 'lnk-5', title: 'Pilot-Canvas', url: 'https://example.invalid/sample/ai-canvas' },
    ],
    projektphase: 'einfuehrung',
    naechster_meilenstein: 'Governance-Review mit Datenschutz',
  },
];

const cloneProject = (project: Project): Project => ({
  ...project,
  ProjectFields: [...(project.ProjectFields || [])],
  teamMembers: (project.teamMembers || []).map((member) => ({ ...member })),
  links: (project.links || []).map((link) => ({ ...link })),
});

export const isSampleDataInstance = (
  instance: Pick<RoadmapInstanceConfig, 'features' | 'metadata'> | null | undefined
): boolean => {
  if (!instance) return false;
  const featureFlag = instance.features?.sampleData;
  const metadataFlag = instance.metadata?.sampleData;
  return (
    featureFlag === true || featureFlag === 'true' || featureFlag === 1 || metadataFlag === true
  );
};

export const getSampleCategories = (): Category[] =>
  SAMPLE_CATEGORIES.map((category) => ({ ...category }));

export const getSampleProjects = (): Project[] => SAMPLE_PROJECTS.map(cloneProject);

export const getSampleProjectById = (id: string): Project | null => {
  const project = SAMPLE_PROJECTS.find((entry) => entry.id === id);
  return project ? cloneProject(project) : null;
};
