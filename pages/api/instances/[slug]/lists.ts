import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { extractAdminSession } from '@/utils/apiAuth';
import { clientDataService } from '@/utils/clientDataService';
import { mapInstanceRecord } from '@/utils/instanceConfig';
import {
  deleteSharePointListForInstance,
  ensureSharePointListForInstance,
  getSharePointListOverview,
  provisionSharePointForInstance,
} from '@/utils/sharePointProvisioning';
import { sanitizeSlug } from '../helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slugParam = req.query.slug;
  const slug =
    typeof slugParam === 'string'
      ? sanitizeSlug(slugParam)
      : Array.isArray(slugParam) && slugParam.length > 0
        ? sanitizeSlug(slugParam[0])
        : null;

  if (!slug) {
    return res.status(400).json({ error: 'Invalid slug' });
  }

  const record = await prisma.roadmapInstance.findUnique({
    where: { slug },
    include: { hosts: true },
  });
  if (!record) {
    return res.status(404).json({ error: 'Instance not found' });
  }

  const instance = mapInstanceRecord(record);

  const session = extractAdminSession(req);
  if (!session?.isAdmin) {
    try {
      const allowed = await clientDataService.withInstance(instance.slug, () =>
        clientDataService.isCurrentUserAdmin()
      );
      if (!allowed) return res.status(401).json({ error: 'Unauthorized' });
    } catch (error) {
      console.error('[instances:lists] service-account admin check failed', error);
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (req.method === 'GET') {
    try {
      const lists = await getSharePointListOverview(instance);
      return res.status(200).json({ lists });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      // eslint-disable-next-line no-console
      console.error('[instances:lists] overview failed', error);
      return res.status(500).json({ error: message });
    }
  }

  if (req.method === 'POST') {
    const { key } = req.body ?? {};
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'key is required' });
    }

    if (key === '__all__') {
      try {
        const result = await provisionSharePointForInstance(instance);
        return res.status(200).json({ result, mode: 'all' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
        const details = (error as Error & { details?: unknown })?.details;
        // eslint-disable-next-line no-console
        console.error('[instances:lists] ensure all failed', error);
        return res.status(500).json({ error: message, details });
      }
    }

    try {
      const result = await ensureSharePointListForInstance(instance, key);
      return res.status(200).json({ result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      const details = (error as Error & { details?: unknown })?.details;
      // eslint-disable-next-line no-console
      console.error('[instances:lists] ensure failed', error);
      return res.status(500).json({ error: message, details });
    }
  }

  if (req.method === 'DELETE') {
    const { key } = req.body ?? {};
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'key is required' });
    }
    try {
      const result = await deleteSharePointListForInstance(instance, key);
      return res.status(200).json({ result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      const details = (error as Error & { details?: unknown })?.details;
      // eslint-disable-next-line no-console
      console.error('[instances:lists] delete failed', error);
      return res.status(500).json({ error: message, details });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
