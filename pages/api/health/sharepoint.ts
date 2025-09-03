import { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const start = Date.now();
  try {
    const projects = await clientDataService.getAllProjects();
    res.status(200).json({
      ok: true,
      projectCount: projects.length,
      elapsedMs: Date.now() - start,
      site: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV,
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || 'Unknown error' });
  }
}
