import { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';
import { extractAdminSession, requireAdminSession } from '@/utils/apiAuth';
import { isAdminSessionAllowedForInstance } from '@/utils/instanceAccessServer';
import { getInstanceConfigFromRequest } from '@/utils/instanceConfig';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let instance: RoadmapInstanceConfig | null = null;
  try {
    instance = await getInstanceConfigFromRequest(req, { fallbackToDefault: false });
  } catch (error) {
    console.error('[api/categories] failed to resolve instance', error);
    return res.status(500).json({ error: 'Failed to resolve roadmap instance' });
  }
  if (!instance) {
    return res.status(404).json({ error: 'No roadmap instance configured for this request' });
  }

  // GET - Fetch all categories
  if (req.method === 'GET') {
    try {
      const session = requireAdminSession(req);
      if (!(await isAdminSessionAllowedForInstance({ session, instance }))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Use clientDataService directly
      const categories = await clientDataService.withInstance(instance.slug, () =>
        clientDataService.getAllCategories()
      );

      res.status(200).json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  }
  // POST - Create a new category
  else if (req.method === 'POST') {
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

      const { name, color, icon } = req.body;
      if (!name || !color || !icon) {
        return res.status(400).json({ error: 'Name, color, and icon are required' });
      }
      const newCategory = await clientDataService.withInstance(instance.slug, () =>
        clientDataService.createCategory({ name, color, icon })
      );
      res.status(201).json(newCategory);
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ error: 'Failed to create category' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
