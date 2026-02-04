import { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';
import { extractAdminSession } from '@/utils/apiAuth';
import { isAdminUserAllowedForInstance } from '@/utils/instanceAccess';
import { getInstanceConfigFromRequest } from '@/utils/instanceConfig';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const disableCache = () => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    const maybeRemovable = res as NextApiResponse & { removeHeader?: (name: string) => void };
    if (typeof maybeRemovable.removeHeader === 'function') {
      maybeRemovable.removeHeader('etag');
    }
  };

  let instance: RoadmapInstanceConfig | null = null;
  try {
    instance = await getInstanceConfigFromRequest(req, { fallbackToDefault: false });
  } catch (error) {
    console.error('[api/projects] failed to resolve instance', error);
    return res.status(500).json({ error: 'Failed to resolve roadmap instance' });
  }
  if (!instance) {
    return res.status(404).json({ error: 'No roadmap instance configured for this request' });
  }

  // GET - Fetch all projects
  if (req.method === 'GET') {
    disableCache();
    try {
      const projects = await clientDataService.withInstance(instance.slug, () =>
        clientDataService.getAllProjects()
      );
      // Normalize category values (trim + numeric-like collapse) to keep consistent with UI expectations
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
      const emptyPrimary = Array.isArray(projects) ? projects.filter((p) => !p.category).length : 0;
      res.setHeader('x-projects-count', String(Array.isArray(projects) ? projects.length : 0));
      res.setHeader('x-projects-empty-primary', String(emptyPrimary));

      // Server-side minimal category hydration if still all empty
      if (Array.isArray(projects) && projects.length > 0 && projects.every((p) => !p.category)) {
        try {
          const listTitle = await clientDataService.withInstance(instance.slug, () =>
            clientDataService.resolveListTitle('RoadmapProjects', ['Roadmap Projects'])
          );
          const encodedTitle = encodeURIComponent(listTitle);
          const url = `/_api/web/lists/getByTitle('${encodedTitle}')/items?$select=Id,Category`;
          const r = await clientDataService.withInstance(instance.slug, () =>
            clientDataService.sharePointFetch(url, {
              headers: { Accept: 'application/json;odata=nometadata' },
            })
          );
          if (r.ok) {
            const j = await r.json();
            const rawItems = Array.isArray(j?.value)
              ? j.value
              : Array.isArray(j?.d?.results)
                ? j.d.results
                : [];
            type SharePointCategoryRow = {
              Id?: number | string;
              ID?: number | string;
              Category?: unknown;
              Bereich?: unknown;
              Bereiche?: unknown;
            };
            const items: SharePointCategoryRow[] = Array.isArray(rawItems)
              ? (rawItems as SharePointCategoryRow[])
              : [];
            if (items.length) {
              const map: Record<string, string> = {};
              const normalize = (input: unknown): string => {
                if (input === null || input === undefined) return '';
                if (typeof input === 'number') return String(input);
                if (typeof input === 'string') {
                  const trimmed = input.trim();
                  if (!trimmed) return '';
                  if (/^\d+(?:\.\d+)?$/.test(trimmed)) return String(parseInt(trimmed, 10));
                  return trimmed;
                }
                if (typeof input === 'object') {
                  const obj = input as Record<string, unknown>;
                  const candidateKeys = ['Id', 'ID', 'Value', 'LookupId', 'LookupID'];
                  for (const key of candidateKeys) {
                    if (obj[key] !== undefined) {
                      const normalized = normalize(obj[key]);
                      if (normalized) return normalized;
                    }
                  }
                }
                return '';
              };
              for (const it of items) {
                const pid = String(it.Id ?? it.ID ?? '');
                if (!pid) continue;
                const normalized = normalize(it.Category ?? it.Bereich ?? it.Bereiche);
                if (normalized) map[pid] = normalized;
              }
              for (const p of projects) {
                if (!p.category && map[p.id]) p.category = map[p.id];
              }
              res.setHeader('x-projects-fallback', 'minimal-category-hydration');
            }
          }
        } catch (e: unknown) {
          console.warn('[api/projects] server category hydration failed', e);
        }
      }

      if (Array.isArray(projects)) {
        const emptyFinal = projects.filter((p) => !p.category).length;
        res.setHeader('x-projects-empty-final', String(emptyFinal));
      }
      res.status(200).json(projects);
    } catch (error: unknown) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }
  // POST - Create a new project
  else if (req.method === 'POST') {
    disableCache();
    try {
      const session = extractAdminSession(req);
      const sessionUsername =
        (typeof session?.username === 'string' && session.username) ||
        (typeof session?.displayName === 'string' && session.displayName) ||
        null;

      if (session?.isAdmin) {
        if (!isAdminUserAllowedForInstance(sessionUsername, instance)) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      } else {
        // Admin-only: ensure caller is a Site Collection Admin
        const isAdmin = await clientDataService.withInstance(instance.slug, () =>
          clientDataService.isCurrentUserAdmin()
        );
        if (!isAdmin) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
      }

      const projectData = req.body;
      const newProject = await clientDataService.withInstance(instance.slug, () =>
        clientDataService.createProject(projectData)
      );
      res.status(201).json(newProject);
    } catch (error: unknown) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
