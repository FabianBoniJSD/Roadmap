import type { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';
import { getInstanceConfigFromRequest } from '@/utils/instanceConfig';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let instance: RoadmapInstanceConfig | null = null;
  try {
    instance = await getInstanceConfigFromRequest(req);
  } catch (error) {
    console.error('[api/settings/key/[key]] failed to resolve instance', error);
    return res.status(500).json({ message: 'Failed to resolve roadmap instance' });
  }
  if (!instance) {
    return res.status(404).json({ message: 'No roadmap instance configured for this request' });
  }

  // For this endpoint, we don't require authentication since it's used by the public roadmap

  const { key } = req.query;

  if (!key || typeof key !== 'string') {
    return res.status(400).json({ message: 'Invalid setting key' });
  }

  // Only allow GET requests
  if (req.method === 'GET') {
    try {
      const setting = await clientDataService.withInstance(instance.slug, () =>
        clientDataService.getSettingByKey(key)
      );

      if (!setting) {
        return res.status(404).json({ message: 'Setting not found' });
      }

      return res.status(200).json(setting);
    } catch (error) {
      console.error('Error fetching setting by key:', error);
      return res.status(500).json({ message: 'Error fetching setting' });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
