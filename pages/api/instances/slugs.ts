import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/utils/apiAuth';
import { getInstanceSlugsFromPrincipal, isSuperAdminPrincipal } from '@/utils/instanceAccess';
import { isAdminSessionAllowedForInstance } from '@/utils/instanceAccessServer';

/**
 * Public endpoint: returns minimal instance identifiers (slug + displayName) for UI switching.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    let session;
    try {
      session = requireAdminSession(req);
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const username =
      (typeof session?.username === 'string' && session.username) ||
      (typeof session?.displayName === 'string' && session.displayName) ||
      null;

    const principal = { username, groups: session?.groups };
    const isSuperAdmin = isSuperAdminPrincipal(principal);

    // Fast path: token already contains instance groups.
    const tokenAllowedSlugs = isSuperAdmin ? null : getInstanceSlugsFromPrincipal(principal);
    if (tokenAllowedSlugs && tokenAllowedSlugs.length > 0) {
      const records = await prisma.roadmapInstance.findMany({
        select: { slug: true, displayName: true },
        where: { slug: { in: tokenAllowedSlugs } },
        orderBy: { slug: 'asc' },
      });
      const instances = records.map((r) => ({
        slug: r.slug,
        displayName: r.displayName || r.slug,
      }));
      return res.status(200).json({ instances });
    }

    // Fallback: if no implicit groups are present in the JWT, verify membership in
    // SharePoint site group "admin-<slug>" for each instance.
    const allRecords = await prisma.roadmapInstance.findMany({
      select: { slug: true, displayName: true },
      orderBy: { slug: 'asc' },
    });

    if (isSuperAdmin) {
      const instances = allRecords.map((r) => ({
        slug: r.slug,
        displayName: r.displayName || r.slug,
      }));
      return res.status(200).json({ instances });
    }

    const checks = await Promise.all(
      allRecords.map(async (r) => ({
        record: r,
        allowed: await isAdminSessionAllowedForInstance({ session, instance: { slug: r.slug } }),
      }))
    );

    const instances = checks
      .filter((c) => c.allowed)
      .map((c) => ({
        slug: c.record.slug,
        displayName: c.record.displayName || c.record.slug,
      }));

    return res.status(200).json({ instances });
  } catch (error) {
    console.error('[instances:slugs] failed to load slugs', error);
    return res.status(500).json({ error: 'Failed to load instances' });
  }
}
