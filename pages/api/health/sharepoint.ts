import { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';
import { getInstanceConfigFromRequest } from '@/utils/instanceConfig';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const start = Date.now();
  try {
    let instance: RoadmapInstanceConfig | null = null;
    try {
      instance = await getInstanceConfigFromRequest(req, { fallbackToDefault: false });
    } catch (error) {
      console.error('[health/sharepoint] failed to resolve instance', error);
      return res.status(500).json({ ok: false, error: 'Failed to resolve roadmap instance' });
    }
    if (!instance) {
      return res.status(404).json({ ok: false, error: 'No roadmap instance configured' });
    }

    const projects = await clientDataService.withInstance(instance.slug, () =>
      clientDataService.getAllProjects()
    );
    res.status(200).json({
      ok: true,
      projectCount: projects.length,
      elapsedMs: Date.now() - start,
      site: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({ ok: false, error: message });
  }
}
