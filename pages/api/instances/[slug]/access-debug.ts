import type { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';
import path from 'path';
import prisma from '@/lib/prisma';
import { extractAdminSession } from '@/utils/apiAuth';
import { isAdminSessionAllowedForInstance } from '@/utils/instanceAccessServer';
import { clientDataService } from '@/utils/clientDataService';
import {
  isDepartmentAllowedForInstance,
  normalizeDepartment,
} from '@/utils/instanceDepartmentAccess';
import { sanitizeSlug } from '../helpers';

type DebugResponse = {
  slug: string;
  runtime: {
    cwd: string;
    databaseUrl: string | null;
    sqliteFilePath: string | null;
  };
  session: {
    username: string | null;
    displayName: string | null;
    source: string | null;
    tokenDepartment: string | null;
    tokenDepartmentNormalized: string | null;
    onPremDepartment: string | null;
    groupCandidates: string[];
    groupsCount: number;
  };
  departmentAccess: {
    allowedDepartments: Array<{ department: string; normalizedDepartment: string }>;
    instanceDepartmentFallback: string | null;
    departmentMatch: boolean;
  };
  finalAccess: boolean;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toLooseDepartmentKey = (value: unknown): string =>
  normalizeDepartment(value)
    .replace(/[&+]/g, ' und ')
    .replace(/[\\/|]+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();

const isLooseDepartmentMatch = (left: string, right: string): boolean => {
  const l = toLooseDepartmentKey(left);
  const r = toLooseDepartmentKey(right);
  if (!l || !r) return false;
  if (l === r) return true;
  return l.includes(r) || r.includes(l);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const session = extractAdminSession(req);
  if (!session?.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const slugParam = req.query.slug;
  const slug =
    typeof slugParam === 'string'
      ? sanitizeSlug(slugParam)
      : Array.isArray(slugParam) && slugParam.length > 0
        ? sanitizeSlug(slugParam[0])
        : null;

  if (!slug) {
    return res.status(400).json({ error: 'Invalid slug' });
  }

  const sessionRecord = asRecord(session);
  const entra = asRecord(session?.entra);
  const tokenDepartment =
    (entra && typeof entra.department === 'string' ? entra.department : null) ||
    (sessionRecord && typeof sessionRecord.department === 'string'
      ? sessionRecord.department
      : null);
  const tokenDepartmentNormalized = normalizeDepartment(tokenDepartment);
  const groupCandidates = Array.isArray(session?.groups)
    ? session.groups.filter((g): g is string => typeof g === 'string').map((g) => g.trim())
    : [];

  const onPremDepartment = await clientDataService.withInstance(slug, () =>
    clientDataService.resolveUserDepartmentFromSharePoint({
      username: typeof session?.username === 'string' ? session.username : null,
      upn: entra && typeof entra.upn === 'string' ? entra.upn : null,
      mail: entra && typeof entra.mail === 'string' ? entra.mail : null,
      displayName: typeof session?.displayName === 'string' ? session.displayName : null,
    })
  );

  const allowedRows = await prisma
    .$queryRaw<Array<{ department: string; normalizedDepartment: string }>>(
      Prisma.sql`
      SELECT "department", "normalizedDepartment"
      FROM "InstanceDepartmentAccess"
      WHERE "instanceSlug" = ${slug}
      ORDER BY "normalizedDepartment" ASC
    `
    )
    .catch(() => []);

  const instanceDepartmentRow = await prisma
    .$queryRaw<Array<{ department: string | null }>>(
      Prisma.sql`
      SELECT "department"
      FROM "RoadmapInstance"
      WHERE "slug" = ${slug}
      LIMIT 1
    `
    )
    .catch(() => []);
  const instanceDepartmentFallback =
    instanceDepartmentRow.length > 0 && typeof instanceDepartmentRow[0]?.department === 'string'
      ? instanceDepartmentRow[0].department
      : null;

  const departmentMatch =
    Boolean(tokenDepartmentNormalized) &&
    allowedRows.some((row) => {
      const candidate = String(row.normalizedDepartment || row.department || '').trim();
      if (!candidate) return false;
      if (candidate === tokenDepartmentNormalized) return true;
      return isLooseDepartmentMatch(candidate, tokenDepartmentNormalized);
    }) &&
    (await isDepartmentAllowedForInstance({
      instanceSlug: slug,
      department: tokenDepartmentNormalized || '',
    }));

  const finalAccess = await isAdminSessionAllowedForInstance({
    session,
    instance: { slug },
  });

  const databaseUrl =
    typeof process.env.DATABASE_URL === 'string' ? process.env.DATABASE_URL : null;
  const sqliteFilePath =
    databaseUrl && databaseUrl.startsWith('file:')
      ? path.resolve(process.cwd(), databaseUrl.replace(/^file:/, ''))
      : null;

  const response: DebugResponse = {
    slug,
    runtime: {
      cwd: process.cwd(),
      databaseUrl,
      sqliteFilePath,
    },
    session: {
      username: typeof session?.username === 'string' ? session.username : null,
      displayName: typeof session?.displayName === 'string' ? session.displayName : null,
      source: typeof session?.source === 'string' ? session.source : null,
      tokenDepartment,
      tokenDepartmentNormalized: tokenDepartmentNormalized || null,
      onPremDepartment: onPremDepartment || null,
      groupCandidates,
      groupsCount: Array.isArray(session?.groups) ? session.groups.length : 0,
    },
    departmentAccess: {
      allowedDepartments: allowedRows.map((r) => ({
        department: String(r.department || ''),
        normalizedDepartment: String(r.normalizedDepartment || ''),
      })),
      instanceDepartmentFallback,
      departmentMatch,
    },
    finalAccess,
  };

  return res.status(200).json(response);
}
