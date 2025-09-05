import { getSP, SP_LISTS } from './spConfig';
import "@pnp/sp/items/get-all";
// @ts-ignore minimal shims when node types absent
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const process: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

// Project model types to match your current schema
export interface Project {
  id: string;
  title: string;
  category: string;
  startQuarter: string;
  endQuarter: string;
  description: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  projektleitung: string;
  bisher: string;
  zukunft: string;
  fortschritt: number;
  geplante_umsetzung: string;
  budget: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface FieldType {
  id?: string;
  name: string;
  type: string;
  description: string;
}

export interface Field {
  id?: string;
  type: string;
  value: string;
  projectId: string;
}

export interface TeamMember {
  id?: string;
  name: string;
  role: string;
  projectId: string;
}

interface IDataService {
  getAllProjects(): Promise<Project[]>;
  getProjectById(id: string): Promise<Project | null>;
  createProject(project: Omit<Project, 'id'>): Promise<Project>;
  updateProject(id: string, project: Partial<Project>): Promise<void>;
  deleteProject(id: string): Promise<void>;
  getAllCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | null>;
  getAllFieldTypes(): Promise<FieldType[]>;
  getFieldTypeById(id: string): Promise<FieldType | null>;
  getFieldsByProjectId(projectId: string): Promise<Field[]>;
  getTeamMembersByProjectId(projectId: string): Promise<TeamMember[]>;
}

// ---------------- SharePoint Implementation ----------------
export class SharePointDataService implements IDataService {
  private sp: any;
  
  constructor(context?: any) {
  this.sp = getSP();
  }

  // PROJECT OPERATIONS
  
  async getAllProjects(): Promise<Project[]> {
    try {
      const items = await this.sp.web.lists.getByTitle(SP_LISTS.PROJECTS).items
        .select("Id,Title,Category,StartQuarter,EndQuarter,Description,Status,Projektleitung,Bisher,Zukunft,Fortschritt,GeplantUmsetzung,Budget")
        .getAll();
      
      return items.map((item: { Id: { toString: () => any; }; Title: any; Category: any; StartQuarter: any; EndQuarter: any; Description: any; Status: any; Projektleitung: any; Bisher: any; Zukunft: any; Fortschritt: any; GeplantUmsetzung: any; Budget: any; }) => ({
        id: item.Id.toString(),
        title: item.Title,
        category: item.Category,
        startQuarter: item.StartQuarter,
        endQuarter: item.EndQuarter,
        description: item.Description || '',
        status: item.Status,
        projektleitung: item.Projektleitung || '',
        bisher: item.Bisher || '',
        zukunft: item.Zukunft || '',
        fortschritt: item.Fortschritt || 0,
        geplante_umsetzung: item.GeplantUmsetzung || '',
        budget: item.Budget || '',
      }));
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }

  async getProjectById(id: string): Promise<Project | null> {
    try {
      const item = await this.sp.web.lists.getByTitle(SP_LISTS.PROJECTS).items
        .getById(parseInt(id))
        .select("Id,Title,Category,StartQuarter,EndQuarter,Description,Status,Projektleitung,Bisher,Zukunft,Fortschritt,GeplantUmsetzung,Budget")();
      
      return {
        id: item.Id.toString(),
        title: item.Title,
        category: item.Category,
        startQuarter: item.StartQuarter,
        endQuarter: item.EndQuarter,
        description: item.Description || '',
        status: item.Status,
        projektleitung: item.Projektleitung || '',
        bisher: item.Bisher || '',
        zukunft: item.Zukunft || '',
        fortschritt: item.Fortschritt || 0,
        geplante_umsetzung: item.GeplantUmsetzung || '',
        budget: item.Budget || '',
      };
    } catch (error) {
      console.error(`Error fetching project ${id}:`, error);
      return null;
    }
  }

  async createProject(project: Omit<Project, 'id'>): Promise<Project> {
    try {
      const result = await this.sp.web.lists.getByTitle(SP_LISTS.PROJECTS).items.add({
        Title: project.title,
        Category: project.category,
        StartQuarter: project.startQuarter,
        EndQuarter: project.endQuarter,
        Description: project.description,
        Status: project.status,
        Projektleitung: project.projektleitung,
        Bisher: project.bisher,
        Zukunft: project.zukunft,
        Fortschritt: project.fortschritt,
        GeplantUmsetzung: project.geplante_umsetzung,
        Budget: project.budget,
      });
      
      return {
        ...project,
        id: result.data.Id.toString()
      };
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(id: string, project: Partial<Project>): Promise<void> {
    try {
      const updateData: any = {};
      
      if (project.title) updateData.Title = project.title;
      if (project.category) updateData.Category = project.category;
      if (project.startQuarter) updateData.StartQuarter = project.startQuarter;
      if (project.endQuarter) updateData.EndQuarter = project.endQuarter;
      if (project.description !== undefined) updateData.Description = project.description;
      if (project.status) updateData.Status = project.status;
      if (project.projektleitung !== undefined) updateData.Projektleitung = project.projektleitung;
      if (project.bisher !== undefined) updateData.Bisher = project.bisher;
      if (project.zukunft !== undefined) updateData.Zukunft = project.zukunft;
      if (project.fortschritt !== undefined) updateData.Fortschritt = project.fortschritt;
      if (project.geplante_umsetzung !== undefined) updateData.GeplantUmsetzung = project.geplante_umsetzung;
      if (project.budget !== undefined) updateData.Budget = project.budget;
      
      await this.sp.web.lists.getByTitle(SP_LISTS.PROJECTS).items.getById(parseInt(id)).update(updateData);
    } catch (error) {
      console.error(`Error updating project ${id}:`, error);
      throw error;
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      await this.sp.web.lists.getByTitle(SP_LISTS.PROJECTS).items.getById(parseInt(id)).delete();
    } catch (error) {
      console.error(`Error deleting project ${id}:`, error);
      throw error;
    }
  }
  
  // CATEGORY OPERATIONS
  
  async getAllCategories(): Promise<Category[]> {
    try {
      const items = await this.sp.web.lists.getByTitle(SP_LISTS.CATEGORIES).items
        .select("Id,Title,Color,Icon")
        .getAll();
      
      return items.map((item: { Id: { toString: () => any; }; Title: any; Color: any; Icon: any; }) => ({
        id: item.Id.toString(),
        name: item.Title,
        color: item.Color,
        icon: item.Icon,
      }));
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }
  
  async getCategoryById(id: string): Promise<Category | null> {
    try {
      const item = await this.sp.web.lists.getByTitle(SP_LISTS.CATEGORIES).items
        .getById(parseInt(id))
        .select("Id,Title,Color,Icon")();
      
      return {
        id: item.Id.toString(),
        name: item.Title,
        color: item.Color,
        icon: item.Icon,
      };
    } catch (error) {
      console.error(`Error fetching category ${id}:`, error);
      return null;
    }
  }
  
  // FIELD TYPE OPERATIONS
  
  async getAllFieldTypes(): Promise<FieldType[]> {
    try {
      const items = await this.sp.web.lists.getByTitle(SP_LISTS.FIELD_TYPES).items
        .select("Id,Title,Type,Description")
        .getAll();
      
      return items.map((item: { Id: { toString: () => any; }; Title: any; Type: any; Description: any; }) => ({
        id: item.Id.toString(),
        name: item.Title,
        type: item.Type,
        description: item.Description || '',
      }));
    } catch (error) {
      console.error('Error fetching field types:', error);
      return [];
    }
  }
  
  async getFieldTypeById(id: string): Promise<FieldType | null> {
    try {
      const item = await this.sp.web.lists.getByTitle(SP_LISTS.FIELD_TYPES).items
        .getById(parseInt(id))
        .select("Id,Title,Type,Description")();
      
      return {
        id: item.Id.toString(),
        name: item.Title,
        type: item.Type,
        description: item.Description || '',
      };
    } catch (error) {
      console.error(`Error fetching field type ${id}:`, error);
      return null;
    }
  }
  
  // Get fields for a specific project
  async getFieldsByProjectId(projectId: string): Promise<Field[]> {
    try {
      const items = await this.sp.web.lists.getByTitle(SP_LISTS.FIELDS).items
        .filter(`ProjectId eq '${projectId}'`)
        .select("Id,Type,Value,ProjectId")
        .getAll();
      
      return items.map((item: { Id: { toString: () => any; }; Type: any; Value: any; ProjectId: any; }) => ({
        id: item.Id.toString(),
        type: item.Type,
        value: item.Value,
        projectId: item.ProjectId,
      }));
    } catch (error) {
      console.error(`Error fetching fields for project ${projectId}:`, error);
      return [];
    }
  }
  
  // Get team members for a specific project
  async getTeamMembersByProjectId(projectId: string): Promise<TeamMember[]> {
    try {
      const items = await this.sp.web.lists.getByTitle(SP_LISTS.TEAM_MEMBERS).items
        .filter(`ProjectId eq '${projectId}'`)
        .select("Id,Title,Role,ProjectId")
        .getAll();
      
      return items.map((item: { Id: { toString: () => any; }; Title: any; Role: any; ProjectId: any; }) => ({
        id: item.Id.toString(),
        name: item.Title,
        role: item.Role,
        projectId: item.ProjectId,
      }));
    } catch (error) {
      console.error(`Error fetching team members for project ${projectId}:`, error);
      return [];
    }
  }
}

// Export a singleton instance
// ---------------- Local JSON Implementation ----------------
class LocalJsonDataService implements IDataService {
  baseDir: string;
  files = {
    projects: 'projects.json',
    categories: 'categories.json',
    fieldTypes: 'fieldTypes.json',
    fields: 'fields.json',
    team: 'teamMembers.json'
  } as const;

  constructor() {
    this.baseDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), 'local-data');
    if (!fs.existsSync(this.baseDir)) fs.mkdirSync(this.baseDir, { recursive: true });
    // Ensure files exist
    for (const f of Object.values(this.files)) {
      const full = path.join(this.baseDir, f);
      if (!fs.existsSync(full)) fs.writeFileSync(full, '[]', 'utf8');
    }
  }
  private read<T>(key: keyof LocalJsonDataService['files']): T[] {
    try {
      const p = path.join(this.baseDir, this.files[key]);
      const raw = fs.readFileSync(p, 'utf8');
      return JSON.parse(raw) as T[];
    } catch {
      return [];
    }
  }
  private write<T>(key: keyof LocalJsonDataService['files'], data: T[]): void {
    const p = path.join(this.baseDir, this.files[key]);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  }
  private genId(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

  async getAllProjects(): Promise<Project[]> { return this.read<Project>('projects'); }
  async getProjectById(id: string): Promise<Project | null> { return this.read<Project>('projects').find(p => p.id === id) || null; }
  async createProject(project: Omit<Project, 'id'>): Promise<Project> {
    const list = this.read<Project>('projects');
    const created: Project = { ...project, id: this.genId() };
    list.push(created); this.write('projects', list); return created;
  }
  async updateProject(id: string, project: Partial<Project>): Promise<void> {
    const list = this.read<Project>('projects');
    const idx = list.findIndex(p => p.id === id); if (idx === -1) throw new Error('Not found');
    list[idx] = { ...list[idx], ...project, id }; this.write('projects', list);
  }
  async deleteProject(id: string): Promise<void> {
    const list = this.read<Project>('projects').filter(p => p.id !== id); this.write('projects', list);
  }
  async getAllCategories(): Promise<Category[]> { return this.read<Category>('categories'); }
  async getCategoryById(id: string): Promise<Category | null> { return this.read<Category>('categories').find(c => c.id === id) || null; }
  async getAllFieldTypes(): Promise<FieldType[]> { return this.read<FieldType>('fieldTypes'); }
  async getFieldTypeById(id: string): Promise<FieldType | null> { return this.read<FieldType>('fieldTypes').find(f => (f.id||'') === id) || null; }
  async getFieldsByProjectId(projectId: string): Promise<Field[]> { return this.read<Field>('fields').filter(f => f.projectId === projectId); }
  async getTeamMembersByProjectId(projectId: string): Promise<TeamMember[]> { return this.read<TeamMember>('team').filter(t => t.projectId === projectId); }
}

// ---------------- Switcher ----------------
const mode = (process.env.DATA_MODE || 'sharepoint').toLowerCase();
export const dataService: IDataService = mode === 'local' ? new LocalJsonDataService() : new SharePointDataService();