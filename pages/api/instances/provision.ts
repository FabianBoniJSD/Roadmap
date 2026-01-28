import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/utils/apiAuth';
import { mapInstanceRecord } from '@/utils/instanceConfig';
import { provisionSharePointForInstance } from '@/utils/sharePointProvisioning';
import type { RoadmapInstanceHealth } from '@/types/roadmapInstance';

type ProvisionResult = {
  slug: string;
  ok: boolean;
  message?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    requireAdminSession(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawSlugs = (req.body as { slugs?: unknown } | null)?.slugs;
  const slugs = Array.isArray(rawSlugs)
    ? rawSlugs.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    : null;

  const records = await prisma.roadmapInstance.findMany({
    where: slugs ? { slug: { in: slugs.map((s) => s.trim()) } } : undefined,
    include: { hosts: true },
    orderBy: { slug: 'asc' },
  });

  const results: ProvisionResult[] = [];

  for (const record of records) {
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
      console.error(`[instances:provision] provisioning failed for ${mapped.slug}`, error);
    }

    await prisma.roadmapInstance.update({
      where: { id: record.id },
      data: {
        spHealthJson: JSON.stringify(health),
        spHealthCheckedAt: new Date(),
      },
    });

    results.push({
      slug: mapped.slug,
      ok: health.permissions.status !== 'error',
      message: health.permissions.message,
    });
  }

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;

  return res.status(200).json({
    results,
    summary: {
      total: results.length,
      ok: okCount,
      failed: failCount,
    },
  });
}
