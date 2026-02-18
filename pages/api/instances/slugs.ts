import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/utils/apiAuth';
import { getInstanceSlugsFromPrincipal, isSuperAdminPrincipal } from '@/utils/instanceAccess';

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
    const allowedSlugs = isSuperAdmin ? null : getInstanceSlugsFromPrincipal(principal);

    if (allowedSlugs && allowedSlugs.length === 0) {
      return res.status(200).json({ instances: [] });
    }

    const records = await prisma.roadmapInstance.findMany({
      select: { slug: true, displayName: true },
      where: allowedSlugs ? { slug: { in: allowedSlugs } } : undefined,
      orderBy: { slug: 'asc' },
    });
    const instances = records.map((r) => ({
      slug: r.slug,
      displayName: r.displayName || r.slug,
    }));
    return res.status(200).json({ instances });
  } catch (error) {
    console.error('[instances:slugs] failed to load slugs', error);
    return res.status(500).json({ error: 'Failed to load instances' });
  }
}
