import { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';
import { extractAdminSession, requireAdminSession } from '@/utils/apiAuth';
import { isAdminSessionAllowedForInstance } from '@/utils/instanceAccessServer';
import { getInstanceConfigFromRequest } from '@/utils/instanceConfig';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  let instance: RoadmapInstanceConfig | null = null;
  try {
    instance = await getInstanceConfigFromRequest(req, { fallbackToDefault: false });
  } catch (error) {
    console.error('[api/projects/[id]] failed to resolve instance', error);
    return res.status(500).json({ error: 'Failed to resolve roadmap instance' });
  }
  if (!instance) {
    return res.status(404).json({ error: 'No roadmap instance configured for this request' });
  }

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  // GET - Fetch a single project
  if (req.method === 'GET') {
    try {
      const session = requireAdminSession(req);
      if (!(await isAdminSessionAllowedForInstance({ session, instance }))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Use clientDataService directly
      const project = await clientDataService.withInstance(instance.slug, () =>
        clientDataService.getProjectById(id)
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
      const session = extractAdminSession(req);

      if (session?.isAdmin) {
        if (!(await isAdminSessionAllowedForInstance({ session, instance }))) {
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
      await clientDataService.withInstance(instance.slug, () =>
        clientDataService.updateProject(id, projectData)
      );
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }
  // DELETE - Delete a project
  else if (req.method === 'DELETE') {
    try {
      const session = extractAdminSession(req);

      if (session?.isAdmin) {
        if (!(await isAdminSessionAllowedForInstance({ session, instance }))) {
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

      await clientDataService.withInstance(instance.slug, () =>
        clientDataService.deleteProject(id)
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
