import type { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';
import { extractAdminSession } from '@/utils/apiAuth';
import { isAdminPrincipalAllowedForInstance } from '@/utils/instanceAccess';
import { getInstanceConfigFromRequest } from '@/utils/instanceConfig';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let instance: RoadmapInstanceConfig | null = null;
  try {
    instance = await getInstanceConfigFromRequest(req, { fallbackToDefault: false });
  } catch (error) {
    console.error('[api/settings] failed to resolve instance', error);
    return res.status(500).json({ message: 'Failed to resolve roadmap instance' });
  }
  if (!instance) {
    return res.status(404).json({ message: 'No roadmap instance configured for this request' });
  }

  // Check authentication for write operations
  if (req.method !== 'GET') {
    try {
      const session = extractAdminSession(req);
      const sessionUsername =
        (typeof session?.username === 'string' && session.username) ||
        (typeof session?.displayName === 'string' && session.displayName) ||
        null;
      const sessionGroups = Array.isArray(session?.groups) ? session.groups : null;

      if (session?.isAdmin) {
        if (
          !isAdminPrincipalAllowedForInstance(
            { username: sessionUsername, groups: sessionGroups },
            instance
          )
        ) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      } else {
        const isAdmin = await clientDataService.withInstance(instance.slug, () =>
          clientDataService.isCurrentUserAdmin()
        );
        if (!isAdmin) {
          return res.status(401).json({ message: 'Unauthorized' });
        }
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      return res.status(401).json({ message: 'Unauthorized' });
    }
  }

  if (req.method === 'GET') {
    try {
      const settings = await clientDataService.withInstance(instance.slug, () =>
        clientDataService.getAppSettings()
      );
      return res.status(200).json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      return res.status(500).json({ message: 'Error fetching settings' });
    }
  } else if (req.method === 'POST') {
    try {
      const { key, value, description } = req.body;

      // Validate required fields
      if (!key || !value) {
        return res.status(400).json({ message: 'Key and value are required' });
      }

      const newSetting = await clientDataService.withInstance(instance.slug, () =>
        clientDataService.createSetting({
          key,
          value,
          description: description || '',
        })
      );

      return res.status(201).json(newSetting);
    } catch (error) {
      console.error('Error creating setting:', error);
      return res.status(500).json({ message: 'Error creating setting' });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
