import { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';
import { requireUserSession } from '@/utils/apiAuth';
import {
  isAdminSessionAllowedForInstance,
  isReadSessionAllowedForInstance,
} from '@/utils/instanceAccessServer';
import { getInstanceConfigFromRequest } from '@/utils/instanceConfig';
import type { Project } from '@/types';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';
import { resolveSharePointSiteUrl } from '@/utils/sharepointEnv';
import { getSampleProjects, isSampleDataInstance } from '@/utils/sampleInstanceData';
import { sanitizeProjectRichTextFields } from '@/utils/richText';
import { getMirroredProjectsForInstance } from '@/utils/instanceMirroring';

const normalizeTeamMembers = (value: unknown): Array<{ name: string; role: string }> => {
  if (!Array.isArray(value)) return [];
  return value
    .map((member) => {
      if (!member || typeof member !== 'object') return null;
      const record = member as Record<string, unknown>;
      const name = typeof record.name === 'string' ? record.name.trim() : '';
      const role =
        typeof record.role === 'string' && record.role.trim() ? record.role.trim() : 'Teammitglied';
      if (!name) return null;
      return { name, role };
    })
    .filter((member): member is { name: string; role: string } => Boolean(member));
};

const normalizeProjectLinks = (value: unknown): Array<{ title: string; url: string }> => {
  if (!Array.isArray(value)) return [];
  return value
    .map((link) => {
      if (!link || typeof link !== 'object') return null;
      const record = link as Record<string, unknown>;
      const title = typeof record.title === 'string' ? record.title.trim() : '';
      const url = typeof record.url === 'string' ? record.url.trim() : '';
      if (!title || !url) return null;
      return { title, url };
    })
    .filter((link): link is { title: string; url: string } => Boolean(link));
};

const omitProjectRelations = (value: unknown): Record<string, unknown> => {
  const record =
    value && typeof value === 'object' ? { ...(value as Record<string, unknown>) } : {};
  delete record.teamMembers;
  delete record.links;
  return record;
};

const syncProjectRelations = async (
  instanceSlug: string,
  forwardedHeaders: { authorization?: string; cookie?: string },
  projectId: string,
  teamMembers: Array<{ name: string; role: string }>,
  links: Array<{ title: string; url: string }>
) => {
  await clientDataService.withRequestHeaders(forwardedHeaders, () =>
    clientDataService.withInstance(instanceSlug, async () => {
      await clientDataService.deleteTeamMembersForProject(projectId);
      for (const member of teamMembers) {
        await clientDataService.createTeamMember({
          name: member.name,
          role: member.role,
          projectId,
        });
      }

      await clientDataService.deleteProjectLinks(projectId);
      for (const link of links) {
        await clientDataService.createProjectLink({
          title: link.title,
          url: link.url,
          projectId,
        });
      }
    })
  );
};

const deriveQuarterDate = (q: string, end = false): string => {
  const year = new Date().getFullYear();
  switch (q) {
    case 'Q1':
      return end
        ? new Date(Date.UTC(year, 2, 31, 23, 59, 59)).toISOString()
        : new Date(Date.UTC(year, 0, 1)).toISOString();
    case 'Q2':
      return end
        ? new Date(Date.UTC(year, 5, 30, 23, 59, 59)).toISOString()
        : new Date(Date.UTC(year, 3, 1)).toISOString();
    case 'Q3':
      return end
        ? new Date(Date.UTC(year, 8, 30, 23, 59, 59)).toISOString()
        : new Date(Date.UTC(year, 6, 1)).toISOString();
    case 'Q4':
      return end
        ? new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString()
        : new Date(Date.UTC(year, 9, 1)).toISOString();
    default:
      return new Date(Date.UTC(year, 0, 1)).toISOString();
  }
};

const mapMinimalSharePointItem = (item: Record<string, unknown>): Project => {
  const id = String(item.Id ?? item.ID ?? '');
  const title = typeof item.Title === 'string' ? item.Title : String(item.Title || '');
  const normalizeCategory = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return '';
      if (/^\d+(?:\.\d+)?$/.test(trimmed)) return String(parseInt(trimmed, 10));
      return trimmed;
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      for (const key of ['Id', 'ID', 'Value', 'LookupId', 'LookupID']) {
        if (obj[key] !== undefined) {
          const normalized = normalizeCategory(obj[key]);
          if (normalized) return normalized;
        }
      }
    }
    return '';
  };

  const category = normalizeCategory(item.Category ?? item.Bereich ?? item.Bereiche);
  const startQuarter =
    item.StartQuarter !== undefined && item.StartQuarter !== null
      ? String(item.StartQuarter).replace(/(Q[1-4])\s+20\d{2}/, '$1')
      : 'Q1';
  const endQuarter =
    item.EndQuarter !== undefined && item.EndQuarter !== null
      ? String(item.EndQuarter).replace(/(Q[1-4])\s+20\d{2}/, '$1')
      : startQuarter || 'Q1';

  return {
    id,
    title,
    projectType:
      item.ProjectType !== undefined && item.ProjectType !== null && String(item.ProjectType)
        ? String(item.ProjectType).toLowerCase() === 'short'
          ? 'short'
          : 'long'
        : 'long',
    category,
    startQuarter,
    endQuarter,
    description: typeof item.Description === 'string' ? item.Description : '',
    status:
      typeof item.Status === 'string' && item.Status.trim()
        ? (String(item.Status).toLowerCase() as Project['status'])
        : 'planned',
    ProjectFields: [],
    badges:
      typeof item.Badges === 'string'
        ? item.Badges.split(/[;,\n]/)
            .map((entry) => entry.trim())
            .filter(Boolean)
        : typeof item.ProjectBadges === 'string'
          ? item.ProjectBadges.split(/[;,\n]/)
              .map((entry) => entry.trim())
              .filter(Boolean)
          : [],
    projektleitung: typeof item.Projektleitung === 'string' ? item.Projektleitung : '',
    teamMembers: [],
    bisher: typeof item.Bisher === 'string' ? item.Bisher : '',
    zukunft: typeof item.Zukunft === 'string' ? item.Zukunft : '',
    fortschritt: Number(item.Fortschritt || 0),
    geplante_umsetzung: typeof item.GeplantUmsetzung === 'string' ? item.GeplantUmsetzung : '',
    budget: typeof item.Budget === 'string' ? item.Budget : '',
    startDate:
      item.StartDate !== undefined && item.StartDate !== null && String(item.StartDate)
        ? String(item.StartDate)
        : deriveQuarterDate(startQuarter || 'Q1'),
    endDate:
      item.EndDate !== undefined && item.EndDate !== null && String(item.EndDate)
        ? String(item.EndDate)
        : deriveQuarterDate(endQuarter || startQuarter || 'Q1', true),
    links: [],
  };
};

const buildAbsoluteBaseUrl = (req: NextApiRequest): string => {
  const internal = (process.env.INTERNAL_API_BASE_URL || '').trim();
  if (internal) return internal.replace(/\/$/, '');

  const protoHeader = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(protoHeader)
    ? protoHeader[0]
    : typeof protoHeader === 'string'
      ? protoHeader.split(',')[0].trim()
      : 'http';
  const hostHeader = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  return `${proto}://${host}`.replace(/\/$/, '');
};

type ProxyProbeResult = {
  projects: Project[];
  probe: string[];
};

const fetchProjectsViaExplicitInstanceProxy = async (
  req: NextApiRequest,
  instance: RoadmapInstanceConfig
): Promise<ProxyProbeResult> => {
  const baseUrl = buildAbsoluteBaseUrl(req);
  const encodedInstance = encodeURIComponent(instance.slug);
  const candidateLists = ['Roadmap Projects'];
  const select = encodeURIComponent(
    'Id,Title,ProjectType,Category,Bereich,Bereiche,StartQuarter,EndQuarter,Description,Status,Projektleitung,Bisher,Zukunft,Fortschritt,GeplantUmsetzung,Budget,StartDate,EndDate,Badges,ProjectBadges'
  );
  const probe: string[] = [];

  const extractItems = (json: unknown): unknown[] => {
    if (!json || typeof json !== 'object') return [];
    const root = json as Record<string, unknown>;

    if (Array.isArray(root.value)) return root.value;

    const d = root.d;
    if (d && typeof d === 'object') {
      const dObj = d as Record<string, unknown>;
      if (Array.isArray(dObj.results)) return dObj.results;
      return [dObj];
    }

    return [];
  };

  for (const listTitle of candidateLists) {
    const encodedTitle = encodeURIComponent(listTitle);
    const queries = [
      `?$select=${select}&$orderby=Id%20desc&$top=5000`,
      '?$orderby=Id%20desc&$top=5000',
      '?$top=1',
    ];
    for (const query of queries) {
      const url = `${baseUrl}/api/sharepoint/_api/web/lists/getByTitle('${encodedTitle}')/items${query}&roadmapInstance=${encodedInstance}`;
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json;odata=nometadata',
            ...(typeof req.headers.cookie === 'string' ? { cookie: req.headers.cookie } : {}),
          },
        });
        if (!response.ok) {
          probe.push(`${listTitle}:${query}:status=${response.status}`);
          continue;
        }
        const json = await response.json();
        const rawItems = extractItems(json);
        probe.push(`${listTitle}:${query}:status=200,count=${rawItems.length}`);
        if (!Array.isArray(rawItems) || rawItems.length === 0) continue;
        if (query === '?$top=1') continue;

        const mapped = rawItems
          .map((item: unknown) =>
            item && typeof item === 'object'
              ? mapMinimalSharePointItem(item as Record<string, unknown>)
              : null
          )
          .filter((item): item is Project => Boolean(item && item.id));
        if (mapped.length > 0) return { projects: mapped, probe };
      } catch {
        probe.push(`${listTitle}:${query}:error`);
      }
    }
  }

  return { projects: [], probe };
};

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
    instance = await getInstanceConfigFromRequest(req);
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
      const forwardedHeaders = {
        authorization:
          typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
        cookie: typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined,
      };

      const session = requireUserSession(req);
      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (
        !(await isReadSessionAllowedForInstance({
          session,
          instance,
          requestHeaders: forwardedHeaders,
        }))
      ) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      res.setHeader('x-projects-instance', instance.slug);
      res.setHeader('x-projects-sharepoint-site', resolveSharePointSiteUrl(instance));

      let projects = isSampleDataInstance(instance)
        ? getSampleProjects()
        : await clientDataService.withRequestHeaders(forwardedHeaders, () =>
            clientDataService.withInstance(instance.slug, () => clientDataService.getAllProjects())
          );

      const { mirroredProjects } = await getMirroredProjectsForInstance({
        instance,
        forwardedHeaders,
      });

      if (mirroredProjects.length > 0) {
        projects = [...projects, ...mirroredProjects];
        res.setHeader('x-projects-mirrored-count', String(mirroredProjects.length));
      }

      if (Array.isArray(projects) && projects.length === 0) {
        const explicit = await fetchProjectsViaExplicitInstanceProxy(req, instance);
        const probeValue = explicit.probe.join(';').slice(0, 900);
        if (probeValue) {
          res.setHeader('x-projects-proxy-probe', probeValue);
        }
        if (explicit.projects.length > 0) {
          projects = explicit.projects;
          res.setHeader('x-projects-fallback', 'explicit-instance-proxy-fetch');
        } else {
          res.setHeader('x-projects-fallback', 'none-empty-source');
        }
      }
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
          const listTitle = await clientDataService.withRequestHeaders(forwardedHeaders, () =>
            clientDataService.withInstance(instance.slug, () =>
              clientDataService.resolveListTitle('Roadmap Projects')
            )
          );
          const encodedTitle = encodeURIComponent(listTitle);
          const url = `/_api/web/lists/getByTitle('${encodedTitle}')/items?$select=Id,Category`;
          const r = await clientDataService.withRequestHeaders(forwardedHeaders, () =>
            clientDataService.withInstance(instance.slug, () =>
              clientDataService.sharePointFetch(url, {
                headers: { Accept: 'application/json;odata=nometadata' },
              })
            )
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
      if (isSampleDataInstance(instance)) {
        return res.status(501).json({ error: 'Sample data instance is read-only' });
      }

      const forwardedHeaders = {
        authorization:
          typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
        cookie: typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined,
      };

      const session = requireUserSession(req);

      if (
        !(await isAdminSessionAllowedForInstance({
          session,
          instance,
          requestHeaders: forwardedHeaders,
        }))
      ) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const teamMembers = normalizeTeamMembers(req.body?.teamMembers);
      const links = normalizeProjectLinks(req.body?.links);
      const projectData = sanitizeProjectRichTextFields(
        omitProjectRelations(req.body) as Partial<Project>
      );

      const newProject = await clientDataService.withRequestHeaders(forwardedHeaders, () =>
        clientDataService.withInstance(instance.slug, () =>
          clientDataService.createProject(projectData as Omit<Project, 'id'>)
        )
      );

      await syncProjectRelations(
        instance.slug,
        forwardedHeaders,
        newProject.id,
        teamMembers,
        links
      );

      const hydratedProject = await clientDataService.withRequestHeaders(forwardedHeaders, () =>
        clientDataService.withInstance(instance.slug, () =>
          clientDataService.getProjectById(newProject.id)
        )
      );

      res.status(201).json(hydratedProject || newProject);
    } catch (error: unknown) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
