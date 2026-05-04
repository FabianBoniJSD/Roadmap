import type { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';
import { requireUserSession } from '@/utils/apiAuth';
import { isAdminSessionAllowedForInstance } from '@/utils/instanceAccessServer';
import { getInstanceConfigFromRequest } from '@/utils/instanceConfig';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';
import { isSampleDataInstance } from '@/utils/sampleInstanceData';
import { normalizeCategoryId, UNCATEGORIZED_ID } from '@/utils/categoryUtils';

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
    console.error('[api/projects/reorder] failed to resolve instance', error);
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

    const rawCategoryId = String(req.body?.categoryId || '').trim();
    const rawOrderedProjectIds = req.body?.orderedProjectIds;

    if (!rawCategoryId) {
      return res.status(400).json({ error: 'categoryId is required' });
    }

    if (!Array.isArray(rawOrderedProjectIds)) {
      return res.status(400).json({ error: 'orderedProjectIds must be an array' });
    }

    const result = await clientDataService.withInstance(instance.slug, async () => {
      const [projects, categories, currentOrderMap] = await Promise.all([
        clientDataService.getAllProjects(),
        clientDataService.getAllCategories(),
        clientDataService.getProjectOrderByCategory(),
      ]);

      const validCategoryIds = new Set([
        ...categories.map((category) => category.id),
        UNCATEGORIZED_ID,
      ]);
      if (!validCategoryIds.has(rawCategoryId)) {
        throw new Error('Invalid categoryId');
      }

      const categoryProjectIds = projects
        .filter((project) => normalizeCategoryId(project.category, categories) === rawCategoryId)
        .map((project) => project.id);

      const validProjectIdSet = new Set(categoryProjectIds);
      const normalizedRequestedIds = rawOrderedProjectIds
        .map((id) => (typeof id === 'string' || typeof id === 'number' ? String(id) : ''))
        .map((id) => id.trim())
        .filter(Boolean)
        .filter((id, index, list) => list.indexOf(id) === index)
        .filter((id) => validProjectIdSet.has(id));

      const fullOrder = [
        ...normalizedRequestedIds,
        ...categoryProjectIds.filter((id) => !normalizedRequestedIds.includes(id)),
      ];

      const nextOrderMap = {
        ...currentOrderMap,
        [rawCategoryId]: fullOrder,
      };

      if (fullOrder.length === 0) {
        delete nextOrderMap[rawCategoryId];
      }

      await clientDataService.updateProjectOrderByCategory(nextOrderMap);

      return {
        categoryId: rawCategoryId,
        orderedProjectIds: fullOrder,
      };
    });

    return res.status(200).json(result);
  } catch (error) {
    if ((error as Error)?.message === 'Invalid categoryId') {
      return res.status(400).json({ error: 'Invalid categoryId' });
    }

    console.error('Error reordering projects:', error);
    return res.status(500).json({ error: 'Failed to reorder projects' });
  }
}
