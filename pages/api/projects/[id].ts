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
import { getSampleProjectById, isSampleDataInstance } from '@/utils/sampleInstanceData';
import { sanitizeProjectRichTextFields } from '@/utils/richText';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  let instance: RoadmapInstanceConfig | null = null;
  try {
    instance = await getInstanceConfigFromRequest(req);
  } catch (error) {
    console.error('[api/projects/[id]] failed to resolve instance', error);
    return res.status(500).json({ error: 'Failed to resolve roadmap instance' });
  }
  if (!instance) {
    return res.status(404).json({ error: 'No roadmap instance configured for this request' });
  }

  const forwardedHeaders = {
    authorization:
      typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
    cookie: typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined,
  };

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  // GET - Fetch a single project
  if (req.method === 'GET') {
    try {
      const session = requireUserSession(req);
      if (
        !(await isReadSessionAllowedForInstance({
          session,
          instance,
          requestHeaders: forwardedHeaders,
        }))
      ) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const project = isSampleDataInstance(instance)
        ? getSampleProjectById(id)
        : await clientDataService.withRequestHeaders(forwardedHeaders, () =>
            clientDataService.withInstance(instance.slug, () =>
              clientDataService.getProjectById(id)
            )
          );

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.status(200).json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  }
  // PUT - Update a project
  else if (req.method === 'PUT') {
    try {
      if (isSampleDataInstance(instance)) {
        return res.status(501).json({ error: 'Sample data instance is read-only' });
      }

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

      await clientDataService.withRequestHeaders(forwardedHeaders, () =>
        clientDataService.withInstance(instance.slug, () =>
          clientDataService.updateProject(id, projectData as Partial<Project>)
        )
      );

      await syncProjectRelations(instance.slug, forwardedHeaders, id, teamMembers, links);

      const updatedProject = await clientDataService.withRequestHeaders(forwardedHeaders, () =>
        clientDataService.withInstance(instance.slug, () => clientDataService.getProjectById(id))
      );

      res.status(200).json(updatedProject ?? { success: true });
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }
  // DELETE - Delete a project
  else if (req.method === 'DELETE') {
    try {
      if (isSampleDataInstance(instance)) {
        return res.status(501).json({ error: 'Sample data instance is read-only' });
      }

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

      await clientDataService.withRequestHeaders(forwardedHeaders, () =>
        clientDataService.withInstance(instance.slug, () => clientDataService.deleteProject(id))
      );
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
