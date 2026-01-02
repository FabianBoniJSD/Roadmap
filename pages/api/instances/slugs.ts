import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

/**
 * Public endpoint: returns minimal instance identifiers (slug + displayName) for UI switching.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const records = await prisma.roadmapInstance.findMany({
      select: { slug: true, displayName: true },
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
