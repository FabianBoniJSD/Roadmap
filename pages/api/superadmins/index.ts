import type { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireSuperAdminAccess } from '@/utils/superAdminAccessServer';

type SuperAdminRecord = {
  id: number;
  username: string;
  normalizedUsername: string;
  isActive: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse =
  | { superadmins: SuperAdminRecord[] }
  | { superadmin: SuperAdminRecord }
  | { success: true }
  | { error: string };

const normalize = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const disableCache = (res: NextApiResponse) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
};

const toBoolean = (value: unknown, defaultValue = true): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes') return true;
    if (v === 'false' || v === '0' || v === 'no') return false;
  }
  return defaultValue;
};

const mapRows = (rows: Array<Record<string, unknown>>): SuperAdminRecord[] =>
  rows.map((row) => ({
    id: Number(row.id),
    username: String(row.username || ''),
    normalizedUsername: String(row.normalizedUsername || ''),
    isActive: Boolean(row.isActive),
    note: row.note == null ? null : String(row.note),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  }));

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  disableCache(res);

  try {
    await requireSuperAdminAccess(req);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Forbidden';
    const status = msg === 'Unauthorized' ? 401 : 403;
    return res.status(status).json({ error: status === 401 ? 'Unauthorized' : 'Forbidden' });
  }

  if (req.method === 'GET') {
    try {
      const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT
          "id",
          "username",
          "normalizedUsername",
          "isActive",
          "note",
          "createdAt",
          "updatedAt"
        FROM "SuperAdmin"
        ORDER BY "normalizedUsername" ASC
      `);
      return res.status(200).json({ superadmins: mapRows(rows) });
    } catch {
      return res.status(500).json({ error: 'Failed to load superadmins' });
    }
  }

  if (req.method === 'POST') {
    const usernameRaw = req.body?.username;
    const noteRaw = req.body?.note;
    const isActiveRaw = req.body?.isActive;

    const username = typeof usernameRaw === 'string' ? usernameRaw.trim() : '';
    const normalizedUsername = normalize(username);
    if (!normalizedUsername) {
      return res.status(400).json({ error: 'username is required' });
    }

    const note = typeof noteRaw === 'string' && noteRaw.trim() ? noteRaw.trim() : null;
    const isActive = toBoolean(isActiveRaw, true);

    try {
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "SuperAdmin" (
          "username",
          "normalizedUsername",
          "isActive",
          "note",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${username},
          ${normalizedUsername},
          ${isActive ? 1 : 0},
          ${note},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT("normalizedUsername") DO UPDATE SET
          "username" = excluded."username",
          "isActive" = excluded."isActive",
          "note" = excluded."note",
          "updatedAt" = CURRENT_TIMESTAMP
      `);

      const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT
          "id",
          "username",
          "normalizedUsername",
          "isActive",
          "note",
          "createdAt",
          "updatedAt"
        FROM "SuperAdmin"
        WHERE "normalizedUsername" = ${normalizedUsername}
        LIMIT 1
      `);

      const mapped = mapRows(rows);
      if (mapped.length === 0) {
        return res.status(500).json({ error: 'Failed to save superadmin' });
      }

      return res.status(200).json({ superadmin: mapped[0] });
    } catch {
      return res.status(500).json({ error: 'Failed to save superadmin' });
    }
  }

  if (req.method === 'DELETE') {
    const usernameRaw =
      typeof req.query.username === 'string' ? req.query.username : req.body?.username;
    const normalizedUsername = normalize(usernameRaw);

    if (!normalizedUsername) {
      return res.status(400).json({ error: 'username is required' });
    }

    try {
      const affected = await prisma.$executeRaw(Prisma.sql`
        DELETE FROM "SuperAdmin"
        WHERE "normalizedUsername" = ${normalizedUsername}
      `);

      if (Number(affected) === 0) {
        return res.status(404).json({ error: 'Superadmin not found' });
      }

      return res.status(200).json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Failed to delete superadmin' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
