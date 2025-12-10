import type { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';
import { loadUserCredentialsFromSecrets } from '@/utils/userCredentials';
import { getInstanceConfigFromRequest } from '@/utils/instanceConfig';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

type CheckAdminResponse = {
  isAdmin: boolean;
  mode: 'github-secrets' | 'sharepoint-permissions';
  users?: string[];
  requiresUserSession: boolean;
};

const debugEnabled =
  typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true';

const debugLog = (...args: unknown[]) => {
  if (!debugEnabled) return;
  // eslint-disable-next-line no-console
  console.log('[check-admin]', ...args);
};

/**
 * Admin capability metadata endpoint.
 *
 * Behaviour:
 * 1. If USER_* GitHub Secrets exist → UI must collect credentials and create a session (requiresUserSession=true)
 * 2. Otherwise fallback to SharePoint permission checks using the configured service account.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheckAdminResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let instance: RoadmapInstanceConfig | null = null;
  try {
    instance = await getInstanceConfigFromRequest(req);
  } catch (error) {
    console.error('[check-admin] failed to resolve instance', error);
    return res.status(500).json({ error: 'Failed to resolve roadmap instance' });
  }
  if (!instance) {
    return res.status(404).json({ error: 'No roadmap instance configured for this request' });
  }

  try {
    const githubUsers = loadUserCredentialsFromSecrets();

    if (githubUsers.length > 0) {
      debugLog(`GitHub Secrets mode detected (${githubUsers.length} user(s))`);
      return res.status(200).json({
        isAdmin: false,
        mode: 'github-secrets',
        users: githubUsers.map((u) => u.username),
        requiresUserSession: true,
      });
    }

    debugLog('No USER_* secrets. Falling back to service account check.');
    const isAdmin = await clientDataService.withInstance(instance.slug, () =>
      clientDataService.isCurrentUserAdmin()
    );

    return res.status(200).json({
      isAdmin,
      mode: 'sharepoint-permissions',
      requiresUserSession: false,
    });
  } catch (error) {
    console.error('[check-admin] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
