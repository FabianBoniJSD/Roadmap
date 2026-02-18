import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireSuperAdminSession } from '@/utils/apiAuth';
import { mapInstanceRecord, type PrismaInstanceWithHosts } from '@/utils/instanceConfig';
import { coerceAllowedUsersPayload, getInstanceAdminAccessConfig } from '@/utils/instanceAccess';

const sanitizeSlug = (value: string) => value.trim().toLowerCase();

const decodeSettings = (settingsJson: string | null): Record<string, unknown> => {
  if (!settingsJson) return {};
  try {
    const parsed = JSON.parse(settingsJson);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {
    // ignore parse errors
  }
  return {};
};

const ensureRecordObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value))
    return value as Record<string, unknown>;
  return {};
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slugParam = req.query.slug;
  const slug =
    typeof slugParam === 'string'
      ? sanitizeSlug(slugParam)
      : Array.isArray(slugParam) && slugParam.length > 0
        ? sanitizeSlug(slugParam[0])
        : null;

  if (!slug) return res.status(400).json({ error: 'Invalid slug' });

  try {
    requireSuperAdminSession(req);
  } catch {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const record = (await prisma.roadmapInstance.findUnique({
    where: { slug },
    include: { hosts: true },
  })) as PrismaInstanceWithHosts | null;

  if (!record) return res.status(404).json({ error: 'Instance not found' });

  const mapped = mapInstanceRecord(record);

  if (req.method === 'GET') {
    const cfg = getInstanceAdminAccessConfig(mapped.metadata);
    return res.status(200).json({
      users: cfg?.allowedUsers ?? [],
    });
  }

  if (req.method === 'PUT') {
    const users = coerceAllowedUsersPayload((req.body ?? {})?.users);

    const settings = decodeSettings(record.settingsJson ?? null);
    const metadata = ensureRecordObject(settings.metadata);
    const adminAccess = ensureRecordObject(metadata.adminAccess);

    if (users.length === 0) {
      delete adminAccess.allowedUsers;
    } else {
      adminAccess.allowedUsers = users;
    }

    if (Object.keys(adminAccess).length === 0) {
      delete metadata.adminAccess;
    } else {
      metadata.adminAccess = adminAccess;
    }

    settings.metadata = metadata;

    await prisma.roadmapInstance.update({
      where: { id: record.id },
      data: { settingsJson: JSON.stringify(settings) },
    });

    return res.status(200).json({ users });
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
