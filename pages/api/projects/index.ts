import { NextApiRequest, NextApiResponse } from 'next'
import { clientDataService } from '@/utils/clientDataService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET - Fetch all projects
  if (req.method === 'GET') {
    try {
      // Use clientDataService directly
      let projects = await clientDataService.getAllProjects();
      // Normalize category field defensively (handle numeric-like strings with decimals / whitespace)
      if (Array.isArray(projects)) {
        for (const p of projects) {
          if (p && typeof p.category === 'string') {
            const trimmed = p.category.trim();
            if (/^\d+\.0$/.test(trimmed)) p.category = String(parseInt(trimmed, 10));
            else p.category = trimmed;
          } else if (p && p.category != null) {
            p.category = String(p.category);
          }
        }
      }
      const emptyPrimary = Array.isArray(projects) ? projects.filter(p => !p.category).length : 0;
      // Add visibility header for quick diagnostics
      res.setHeader('x-projects-count', String(Array.isArray(projects) ? projects.length : 0));
      res.setHeader('x-projects-empty-primary', String(emptyPrimary));

      // Server-side minimal fallback via proxy if no projects came back OR all projects have empty categories
      const allHaveEmptyCategories = Array.isArray(projects) && projects.length > 0 && projects.every(p => !p.category || String(p.category).trim() === '');
      if (!Array.isArray(projects) || projects.length === 0 || allHaveEmptyCategories) {
        let base = (process.env.INTERNAL_API_BASE_URL || '').replace(/\/$/, '');
        try {
          const xfProto = (req.headers['x-forwarded-proto'] as string) || '';
          const xfHost = (req.headers['x-forwarded-host'] as string) || '';
          const hostHdr = (req.headers.host as string) || '';
          const socketAny = (req as any)?.socket as any;
          const isHttps = !!(socketAny && socketAny.encrypted);
          const proto = xfProto || (isHttps ? 'https' : 'http');
          const host = xfHost || hostHdr;
          if (host) base = `${proto}://${host}`;
        } catch { }
        if (!base) base = 'https://jdservsvtapp01.bs.ch';
        const url = `${base}/api/sharepoint/_api/web/lists/getByTitle('RoadmapProjects')/items?$select=Id,Title,Category`;
        try {
          const r = await fetch(url, { headers: { 'Accept': 'application/json;odata=nometadata' } });
          if (r.ok) {
            const j = await r.json();
            const items: any[] = Array.isArray(j?.value) ? j.value : (Array.isArray(j?.d?.results) ? j.d.results : []);
            if (items.length > 0) {
              // If we already have projects but with empty categories, merge the category data
              if (allHaveEmptyCategories && Array.isArray(projects)) {
                // Create a map of existing projects by ID for efficient lookup
                const existingProjectsMap = new Map(projects.map(p => [p.id, p]));
                
                // Update existing projects with categories from SharePoint
                items.forEach((it: any) => {
                  const id = String(it.Id ?? it.ID ?? '');
                  const existingProject = existingProjectsMap.get(id);
                  if (existingProject && it.Category) {
                    existingProject.category = String(it.Category).trim();
                  }
                });
                res.setHeader('x-projects-fallback', 'category-fix');
              } else {
                // No existing projects, create new ones from SharePoint data
                projects = items.map((it: any) => {
                  return {
                    id: String(it.Id ?? it.ID ?? ''),
                    title: it.Title || '',
                    category: it.Category,
                    startQuarter: 'Q1',
                    endQuarter: 'Q4',
                    description: '',
                    status: 'planned',
                    ProjectFields: [],
                    projektleitung: '',
                    bisher: '',
                    zukunft: '',
                    fortschritt: 0,
                    geplante_umsetzung: '',
                    budget: '',
                    startDate: '',
                    endDate: '',
                    links: []
                  };
                });
                res.setHeader('x-projects-fallback', 'minimal');
              }
            }
          } else {
            const txt = await r.text();
            console.warn('[projects fallback] SharePoint API failed:', r.status, r.statusText, txt);
          }
        } catch (e) {
          console.warn('[projects fallback] SharePoint API request threw:', e);
        }
      }

      // After possible fallback, compute final empty categories and attach header
      if (Array.isArray(projects)) {
        const emptyFinal = projects.filter(p => !p.category || String(p.category).trim() === '').length;
        res.setHeader('x-projects-empty-final', String(emptyFinal));
        // Debug log (server)
        console.log('[api/projects] sample mapped categories:', projects.slice(0, 5).map(p => ({ id: p.id, cat: p.category })));
      }

      res.status(200).json(projects)
    } catch (error) {
      console.error('Error fetching projects:', error)
      res.status(500).json({ error: 'Failed to fetch projects' })
    }
  }
  // POST - Create a new project
  else if (req.method === 'POST') {
    try {
      // Admin-only: ensure caller is a Site Collection Admin
      const isAdmin = await clientDataService.isCurrentUserAdmin();
      if (!isAdmin) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const projectData = req.body;
      const newProject = await clientDataService.createProject(projectData);
      res.status(201).json(newProject)
    } catch (error) {
      console.error('Error creating project:', error)
      res.status(500).json({ error: 'Failed to create project' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}