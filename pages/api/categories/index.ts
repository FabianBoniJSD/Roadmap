import { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';
import { requireUserSession } from '@/utils/apiAuth';
import {
  isAdminSessionAllowedForInstance,
  isReadSessionAllowedForInstance,
} from '@/utils/instanceAccessServer';
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
    instance = await getInstanceConfigFromRequest(req);
  } catch (error) {
    console.error('[api/categories] failed to resolve instance', error);
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

  // GET - Fetch all categories
  if (req.method === 'GET') {
    disableCache();
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

      // Use clientDataService directly
      const categories = await clientDataService.withInstance(instance.slug, () =>
        clientDataService.getAllCategories()
      );

      res.setHeader('x-categories-instance', instance.slug);
      res.status(200).json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  }
  // POST - Create a new category
  else if (req.method === 'POST') {
    try {
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
