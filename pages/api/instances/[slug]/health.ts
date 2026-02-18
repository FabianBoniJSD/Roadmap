import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireSuperAdminSession } from '@/utils/apiAuth';
import { mapInstanceRecord, toInstanceSummary } from '@/utils/instanceConfig';
import { provisionSharePointForInstance } from '@/utils/sharePointProvisioning';
import type { RoadmapInstanceHealth } from '@/types/roadmapInstance';
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

  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    requireSuperAdminSession(req);
  } catch {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const record = await prisma.roadmapInstance.findUnique({
    where: { slug },
    include: { hosts: true },
  });
  if (!record) {
    return res.status(404).json({ error: 'Instance not found' });
  }

  const mapped = mapInstanceRecord(record);
  let health: RoadmapInstanceHealth;
  try {
    health = await provisionSharePointForInstance(mapped);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    health = {
      checkedAt: new Date().toISOString(),
      permissions: { status: 'error', message },
      lists: {
        ensured: [],
        created: [],
        missing: [],
        fieldsCreated: {},
        errors: { __provision: message },
      },
    };
    // eslint-disable-next-line no-console
    console.error('[instances:health] sharepoint provisioning failed', error);
  }

  const updated = await prisma.roadmapInstance.update({
    where: { id: record.id },
    data: {
      spHealthJson: JSON.stringify(health),
      spHealthCheckedAt: new Date(),
    },
    include: { hosts: true },
  });

  const summary = toInstanceSummary(mapInstanceRecord(updated));
  return res.status(200).json({ instance: summary });
}
