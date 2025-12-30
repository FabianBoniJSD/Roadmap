import type { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';
import { loadUserCredentialsFromSecrets } from '@/utils/userCredentials';
import {
  getInstanceConfigFromRequest,
  mapInstanceRecord,
  type PrismaInstanceWithHosts,
} from '@/utils/instanceConfig';
import prisma from '@/lib/prisma';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

type CheckAdminResponse = {
  isAdmin: boolean;
  mode: 'github-secrets' | 'sharepoint-permissions';
  users?: string[];
  requiresUserSession: boolean;
  instanceSlug?: string;
  instances?: { slug: string; isAdmin: boolean; error?: string }[];
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
  let candidateInstances: RoadmapInstanceConfig[] = [];
  try {
    // Do not fallback to a default instance; require explicit slug/host/cookie resolution first
    instance = await getInstanceConfigFromRequest(req, { fallbackToDefault: false });
    if (instance) {
      candidateInstances = [instance];
    }
  } catch (error) {
    console.error('[check-admin] failed to resolve instance', error);
    return res.status(500).json({ error: 'Failed to resolve roadmap instance' });
  }

  // If no specific instance was resolved, evaluate all configured instances (loop-through mode)
  if (!instance) {
    try {
      const all = await prisma.roadmapInstance.findMany({ include: { hosts: true } });
      candidateInstances = all.map((record: PrismaInstanceWithHosts) => mapInstanceRecord(record));
    } catch (error) {
      console.error('[check-admin] failed to load instances', error);
      return res.status(500).json({ error: 'Failed to load roadmap instances' });
    }

    if (candidateInstances.length === 0) {
      return res.status(404).json({ error: 'No roadmap instances configured' });
    }
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

    const perInstance: { slug: string; isAdmin: boolean; error?: string }[] = [];
    for (const inst of candidateInstances) {
      try {
        const allowed = await clientDataService.withInstance(inst.slug, () =>
          clientDataService.isCurrentUserAdmin()
        );
        perInstance.push({ slug: inst.slug, isAdmin: allowed });
        if (allowed) {
          return res.status(200).json({
            isAdmin: true,
            mode: 'sharepoint-permissions',
            requiresUserSession: false,
            instanceSlug: inst.slug,
            instances: perInstance,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        perInstance.push({ slug: inst.slug, isAdmin: false, error: message });
        console.error('[check-admin] Error during admin check for instance', inst.slug, err);
      }
    }

    return res.status(200).json({
      isAdmin: false,
      mode: 'sharepoint-permissions',
      requiresUserSession: false,
      instances: perInstance,
    });
  } catch (error) {
    console.error('[check-admin] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
