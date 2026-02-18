import { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';
import { extractAdminSession, requireAdminSession } from '@/utils/apiAuth';
import { isAdminPrincipalAllowedForInstance } from '@/utils/instanceAccess';
import { getInstanceConfigFromRequest } from '@/utils/instanceConfig';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  let instance: RoadmapInstanceConfig | null = null;
  try {
    instance = await getInstanceConfigFromRequest(req, { fallbackToDefault: false });
  } catch (error) {
    console.error('[api/categories/[id]] failed to resolve instance', error);
    return res.status(500).json({ error: 'Failed to resolve roadmap instance' });
  }
  if (!instance) {
    return res.status(404).json({ error: 'No roadmap instance configured for this request' });
  }

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid category ID' });
  }

  // GET - Fetch a single category
  if (req.method === 'GET') {
    try {
      const session = requireAdminSession(req);
      const sessionUsername =
        (typeof session?.username === 'string' && session.username) ||
        (typeof session?.displayName === 'string' && session.displayName) ||
        null;
      const sessionGroups = Array.isArray(session?.groups) ? session.groups : null;
      if (
        !isAdminPrincipalAllowedForInstance(
          { username: sessionUsername, groups: sessionGroups },
          instance
        )
      ) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Use clientDataService directly
      const category = await clientDataService.withInstance(instance.slug, () =>
        clientDataService.getCategoryById(id)
      );

      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      res.status(200).json(category);
    } catch (error) {
      console.error('Error fetching category:', error);
      res.status(500).json({ error: 'Failed to fetch category' });
    }
  }
  // PUT - Update a category
  else if (req.method === 'PUT') {
    try {
      const session = extractAdminSession(req);
      const sessionUsername =
        (typeof session?.username === 'string' && session.username) ||
        (typeof session?.displayName === 'string' && session.displayName) ||
        null;
      const sessionGroups = Array.isArray(session?.groups) ? session.groups : null;

      if (session?.isAdmin) {
        if (
          !isAdminPrincipalAllowedForInstance(
            { username: sessionUsername, groups: sessionGroups },
            instance
          )
        ) {
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

      const { name, color, icon } = req.body;

      if (!name || !color || !icon) {
        return res.status(400).json({ error: 'Name, color, and icon are required' });
      }

      // Use clientDataService directly
      await clientDataService.withInstance(instance.slug, () =>
        clientDataService.updateCategory(id, { name, color, icon })
      );

      // Fetch the updated category to return
      const updatedCategory = await clientDataService.withInstance(instance.slug, () =>
        clientDataService.getCategoryById(id)
      );

      res.status(200).json(updatedCategory);
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ error: 'Failed to update category' });
    }
  }
  // DELETE - Delete a category
  else if (req.method === 'DELETE') {
    try {
      const session = extractAdminSession(req);
      const sessionUsername =
        (typeof session?.username === 'string' && session.username) ||
        (typeof session?.displayName === 'string' && session.displayName) ||
        null;
      const sessionGroups = Array.isArray(session?.groups) ? session.groups : null;

      if (session?.isAdmin) {
        if (
          !isAdminPrincipalAllowedForInstance(
            { username: sessionUsername, groups: sessionGroups },
            instance
          )
        ) {
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
        clientDataService.deleteCategory(id)
      );

      res.status(204).end();
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
