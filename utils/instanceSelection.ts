import type { IncomingMessage } from 'http';
import type { NextApiRequest } from 'next';
import prisma from '@/lib/prisma';
import type { AdminSessionPayload } from '@/utils/apiAuth';
import { isSuperAdminSession } from '@/utils/apiAuth';
import { isAdminSessionAllowedForInstance } from '@/utils/instanceAccessServer';
import {
  getInstanceConfigFromRequest,
  mapInstanceRecord,
  type PrismaInstanceWithHosts,
} from '@/utils/instanceConfig';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

type ApiRequestLike =
  | Pick<NextApiRequest, 'headers' | 'cookies' | 'query'>
  | (IncomingMessage & {
      cookies?: Record<string, string>;
      query?: Record<string, string | string[]>;
    });

/**
 * Resolves the best instance for a given request + admin session.
 *
 * Goal: avoid SSR flakiness when no instance cookie/query is set yet.
 * - First honor explicit selection (query/cookie/host mapping)
 * - If none, pick the first instance the admin is allowed to access
 */
export async function resolveInstanceForAdminSession(
  req: ApiRequestLike,
  session: AdminSessionPayload
): Promise<RoadmapInstanceConfig | null> {
  // 1) Use explicit request selection when present.
  const explicit = await getInstanceConfigFromRequest(req, { fallbackToDefault: false });
  if (explicit) return explicit;

  // 2) If superadmin, return the first configured instance (stable order).
  const records = (await prisma.roadmapInstance.findMany({
    include: { hosts: true },
    orderBy: { slug: 'asc' },
  })) as PrismaInstanceWithHosts[];

  if (records.length === 0) return null;
  if (isSuperAdminSession(session)) {
    return mapInstanceRecord(records[0]);
  }

  // 3) For scoped admins, pick the first allowed instance.
  for (const record of records) {
    const instance = mapInstanceRecord(record);
    const allowed = await isAdminSessionAllowedForInstance({ session, instance });
    if (allowed) return instance;
  }

  return null;
}
