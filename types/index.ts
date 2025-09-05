export interface Project {
    id: string;
    title: string;
    category: string;
    startQuarter: string;
    endQuarter: string;
    description: string;
    status: 'planned' | 'in-progress' | 'completed' | 'paused' | 'cancelled';
    ProjectFields: string[];
    projektleitung: string;
    projektleitungImageUrl?: string | null;
    teamMembers?: TeamMember[];
    bisher: string;
    zukunft: string;
    fortschritt: number;
    geplante_umsetzung: string;
    budget: string;
    startDate: string; // Neues Feld für exaktes Startdatum
    endDate: string;   // Neues Feld für exaktes Enddatum
    links?: { id: string; title: string; url: string }[]; // Neues Feld für Links
    // Optional neue Felder für phasenbasierten Fortschritt & Meilenstein
    projektphase?: 'initialisierung' | 'konzept' | 'realisierung' | 'einführung' | 'einfuehrung' | 'abschluss';
    naechster_meilenstein?: string;
}

export interface Category {
    id: string;
    name: string;
    color: string;
    icon: string;
    parentId?: string;      // Added for subcategories support
    isSubcategory?: boolean; // Added for easier filtering
}

export interface TeamMember {
    id?: string;
    name: string;
    role: string;
    userIdentifier?: string;
    imageUrl?: string | null;
    projectId?: string;
}

export interface Field {
    id: string;
    type: string;
    value: string;
    projectId: string;
}

export interface ProjectLink {
    id: string;
    title: string;
    url: string;
    projectId?: string;
}

export interface AppSettings {
    id: string;
    key: string;
    value: string;
    description?: string;
}