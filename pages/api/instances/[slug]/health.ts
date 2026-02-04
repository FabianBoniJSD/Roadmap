import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { extractAdminSession } from '@/utils/apiAuth';
import { clientDataService } from '@/utils/clientDataService';
import { mapInstanceRecord, toInstanceSummary } from '@/utils/instanceConfig';
import { isAdminUserAllowedForInstance } from '@/utils/instanceAccess';
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

  const record = await prisma.roadmapInstance.findUnique({
    where: { slug },
    include: { hosts: true },
  });
  if (!record) {
    return res.status(404).json({ error: 'Instance not found' });
  }

  const mapped = mapInstanceRecord(record);

  // Allow either JWT-based admin session or service-account admin on this instance
  const session = extractAdminSession(req);

  const sessionUsername =
    (typeof session?.username === 'string' && session.username) ||
    (typeof session?.displayName === 'string' && session.displayName) ||
    null;

  if (session?.isAdmin && !isAdminUserAllowedForInstance(sessionUsername, mapped)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!session?.isAdmin) {
    try {
      const allowed = await clientDataService.withInstance(mapped.slug, () =>
        clientDataService.isCurrentUserAdmin()
      );
      if (!allowed) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    } catch (error) {
      console.error('[instances:health] service-account admin check failed', error);
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
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
