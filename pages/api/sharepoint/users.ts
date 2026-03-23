import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdminSession } from '@/utils/apiAuth';
import { clientDataService } from '@/utils/clientDataService';
import { getInstanceConfigFromRequest } from '@/utils/instanceConfig';
import { isAdminSessionAllowedForInstance } from '@/utils/instanceAccessServer';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

type SharePointUserOption = {
  key: string;
  value: string;
  label: string;
  email: string | null;
  loginName: string | null;
  displayName: string;
};

const normalizeLoginName = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutClaims = trimmed.includes('|') ? trimmed.split('|').pop() || trimmed : trimmed;
  return withoutClaims.trim().toLowerCase() || null;
};

const pickStoredValue = (input: {
  email?: string | null;
  loginName?: string | null;
  displayName: string;
}) => {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (email) return email;
  const loginName = normalizeLoginName(input.loginName);
  if (loginName) return loginName;
  return input.displayName.trim().toLowerCase();
};

const mapToOption = (entry: Record<string, unknown>): SharePointUserOption | null => {
  const displayName = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : '';
  const email = typeof entry.email === 'string' && entry.email.trim() ? entry.email.trim() : null;
  const loginName =
    typeof entry.userIdentifier === 'string' && entry.userIdentifier.trim()
      ? entry.userIdentifier.trim()
      : null;
  const label = displayName || email || loginName || '';
  if (!label) return null;
  const value = pickStoredValue({ email, loginName, displayName: label });
  return {
    key: value,
    value,
    label,
    email,
    loginName,
    displayName: displayName || label,
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
  if (query.length < 2) {
    return res.status(200).json({ users: [] });
  }

  let session;
  try {
    session = requireAdminSession(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let instance: RoadmapInstanceConfig | null = null;
  try {
    instance = await getInstanceConfigFromRequest(req, { fallbackToDefault: false });
  } catch (error) {
    console.error('[sharepoint/users] failed to resolve instance', error);
    return res.status(500).json({ error: 'Failed to resolve roadmap instance' });
  }

  if (!instance) {
    return res.status(404).json({ error: 'No roadmap instance configured for this request' });
  }

  const requestHeaders = {
    authorization:
      typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
    cookie: typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined,
  };

  if (
    !(await isAdminSessionAllowedForInstance({
      session,
      instance,
      requestHeaders,
    }))
  ) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const users = await clientDataService.withInstance(instance.slug, () =>
      clientDataService.searchUsers(query)
    );

    return res.status(200).json({
      users: Array.from(
        new Map(
          users
            .map((entry) => mapToOption(entry as unknown as Record<string, unknown>))
            .filter((entry): entry is SharePointUserOption => Boolean(entry))
            .map((entry) => [entry.key, entry])
        ).values()
      ).slice(0, 20),
    });
  } catch (error) {
    console.error('[sharepoint/users] failed to search users', error);
    return res.status(500).json({ error: 'Failed to search users' });
  }
}
