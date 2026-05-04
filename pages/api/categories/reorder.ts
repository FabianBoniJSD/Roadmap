import type { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';
import { requireUserSession } from '@/utils/apiAuth';
import { isAdminSessionAllowedForInstance } from '@/utils/instanceAccessServer';
import { getInstanceConfigFromRequest } from '@/utils/instanceConfig';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';
import { isSampleDataInstance } from '@/utils/sampleInstanceData';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const disableCache = () => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  };

  let instance: RoadmapInstanceConfig | null = null;
  try {
    instance = await getInstanceConfigFromRequest(req);
  } catch (error) {
    console.error('[api/categories/reorder] failed to resolve instance', error);
    return res.status(500).json({ error: 'Failed to resolve roadmap instance' });
  }

  if (!instance) {
    return res.status(404).json({ error: 'No roadmap instance configured for this request' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  disableCache();

  if (isSampleDataInstance(instance)) {
    return res.status(501).json({ error: 'Sample data instance is read-only' });
  }

  const forwardedHeaders = {
    authorization:
      typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
    cookie: typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined,
  };

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

    const rawIds = req.body?.orderedCategoryIds;
    if (!Array.isArray(rawIds)) {
      return res.status(400).json({ error: 'orderedCategoryIds must be an array' });
    }

    const orderedCategoryIds = await clientDataService.withInstance(instance.slug, async () => {
      const categories = await clientDataService.getAllCategories();
      const existingIds = categories.map((category) => category.id);
      const existingIdSet = new Set(existingIds);

      const normalizedRequestedIds = rawIds
        .map((id) => (typeof id === 'string' || typeof id === 'number' ? String(id) : ''))
        .map((id) => id.trim())
        .filter(Boolean)
        .filter((id, index, list) => list.indexOf(id) === index)
        .filter((id) => existingIdSet.has(id));

      const fullOrder = [
        ...normalizedRequestedIds,
        ...existingIds.filter((id) => !normalizedRequestedIds.includes(id)),
      ];

      await clientDataService.updateCategoryOrder(fullOrder);
      return fullOrder;
    });

    return res.status(200).json({ orderedCategoryIds });
  } catch (error) {
    console.error('Error reordering categories:', error);
    return res.status(500).json({ error: 'Failed to reorder categories' });
  }
}
