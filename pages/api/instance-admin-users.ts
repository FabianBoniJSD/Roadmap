import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/utils/apiAuth';
import { getInstanceConfigFromRequest } from '@/utils/instanceConfig';
import {
  appendAllowedUser,
  getInstanceAdminAccessConfig,
  removeAllowedUser,
  updateInstanceAdminAccessMetadata,
} from '@/utils/instanceAccess';
import { isAdminSessionAllowedForInstance } from '@/utils/instanceAccessServer';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

const decodeSettings = (settingsJson: string | null): Record<string, unknown> => {
  if (!settingsJson) return {};
  try {
    const parsed = JSON.parse(settingsJson);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return {};
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    console.error('[instance-admin-users] failed to resolve instance', error);
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

  const record = await prisma.roadmapInstance.findUnique({
    where: { slug: instance.slug },
    select: { id: true, settingsJson: true },
  });

  if (!record) {
    return res.status(404).json({ error: 'Instance not found' });
  }

  const currentSettings = decodeSettings(record.settingsJson ?? null);
  const currentConfig = getInstanceAdminAccessConfig(
    currentSettings.metadata && typeof currentSettings.metadata === 'object'
      ? (currentSettings.metadata as Record<string, unknown>)
      : undefined
  );
  const currentUsers = currentConfig?.allowedUsers ?? [];

  if (req.method === 'GET') {
    return res.status(200).json({ users: currentUsers });
  }

  const usernameRaw =
    typeof req.body?.username === 'string'
      ? req.body.username
      : typeof req.query.username === 'string'
        ? req.query.username
        : '';

  if (!usernameRaw.trim()) {
    return res.status(400).json({ error: 'username is required' });
  }

  if (req.method === 'POST') {
    const users = appendAllowedUser(currentUsers, usernameRaw);
    const nextSettings = updateInstanceAdminAccessMetadata({
      settings: currentSettings,
      users,
    });
    await prisma.roadmapInstance.update({
      where: { id: record.id },
      data: { settingsJson: JSON.stringify(nextSettings) },
    });
    return res.status(200).json({ users });
  }

  if (req.method === 'DELETE') {
    const users = removeAllowedUser(currentUsers, usernameRaw);
    const nextSettings = updateInstanceAdminAccessMetadata({
      settings: currentSettings,
      users,
    });
    await prisma.roadmapInstance.update({
      where: { id: record.id },
      data: { settingsJson: JSON.stringify(nextSettings) },
    });
    return res.status(200).json({ users });
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
