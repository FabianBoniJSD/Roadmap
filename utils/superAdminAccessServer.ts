import type { NextApiRequest } from 'next';
import prisma from '@/lib/prisma';
import type { AdminSessionPayload } from '@/utils/apiAuth';
import { isSuperAdminSession, requireAdminSession } from '@/utils/apiAuth';
import { clientDataService } from '@/utils/clientDataService';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const normalize = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const parseCsv = (value: unknown): string[] => {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const extractIdentifiers = (session: AdminSessionPayload | null | undefined) => {
  const username = typeof session?.username === 'string' ? session.username : null;
  const displayName = typeof session?.displayName === 'string' ? session.displayName : null;
  const entra = asRecord(session?.entra);
  const upn = entra && typeof entra.upn === 'string' ? entra.upn : null;
  const mail = entra && typeof entra.mail === 'string' ? entra.mail : null;
  return { username, upn, mail, displayName };
};

type CacheEntry = { expires: number; ok: boolean };
const superAdminCache: Record<string, CacheEntry> = {};
const SUPERADMIN_CACHE_TTL_MS = 2 * 60 * 1000;

const buildCacheKey = (ids: ReturnType<typeof extractIdentifiers>): string => {
  const primary = ids.upn || ids.mail || ids.username || ids.displayName || 'unknown';
  return normalize(primary);
};

async function getAllInstanceSlugs(): Promise<string[]> {
  const rows = await prisma.roadmapInstance.findMany({
    select: { slug: true },
    orderBy: { slug: 'asc' },
  });
  return rows.map((r) => String(r.slug).toLowerCase()).filter(Boolean);
}

async function getSuperAdminCheckInstanceSlugs(
  candidateInstanceSlugs?: string[]
): Promise<string[]> {
  const candidates = Array.isArray(candidateInstanceSlugs)
    ? candidateInstanceSlugs.map((s) => normalize(s)).filter(Boolean)
    : [];

  // Optional optimization: bind checks to specific instances.
  // - SUPERADMIN_INSTANCE_SLUGS="a,b" checks only those
  // - SUPERADMIN_INSTANCE_SLUGS="all" or "*" checks all configured instances
  const configured = [
    ...parseCsv(process.env.SUPERADMIN_INSTANCE_SLUGS),
    ...parseCsv(process.env.SUPERADMIN_INSTANCE_SLUG),
  ]
    .map((s) => normalize(s))
    .filter(Boolean);

  const wantsAll = configured.includes('all') || configured.includes('*');
  if (configured.length > 0 && !wantsAll) return Array.from(new Set(configured));

  if (candidates.length > 0) return Array.from(new Set(candidates));
  return await getAllInstanceSlugs();
}

export async function isSuperAdminSessionWithSharePointFallback(
  session: AdminSessionPayload | null | undefined,
  opts?: { candidateInstanceSlugs?: string[] }
): Promise<boolean> {
  if (!session) return false;
  if (isSuperAdminSession(session)) return true;

  // If the token already contains *any* group claims, treat it as authoritative
  // for the presence of "superadmin". Only do the SharePoint fallback when the
  // groups claim is missing/empty (common when Graph group scopes aren't granted).
  if (
    Array.isArray(session.groups) &&
    session.groups.some((g) => {
      if (typeof g === 'string') return g.trim().length > 0;
      if (g == null) return false;
      return String(g).trim().length > 0;
    })
  ) {
    return false;
  }

  const ids = extractIdentifiers(session);
  const cacheKey = buildCacheKey(ids);
  const now = Date.now();
  const cached = superAdminCache[cacheKey];
  if (cached && cached.expires > now) return cached.ok;

  const slugs = await getSuperAdminCheckInstanceSlugs(opts?.candidateInstanceSlugs);
  if (slugs.length === 0) return false;

  // Note: sequential on purpose (avoids hammering SharePoint); cached afterwards.
  let ok = false;
  for (const slug of slugs) {
    ok = await clientDataService.withInstance(slug, () =>
      clientDataService.isUserInSharePointGroupByTitle('superadmin', ids)
    );
    if (ok) break;
  }

  superAdminCache[cacheKey] = { ok, expires: now + SUPERADMIN_CACHE_TTL_MS };
  return ok;
}

export async function requireSuperAdminAccess(req: NextApiRequest): Promise<AdminSessionPayload> {
  const session = requireAdminSession(req);
  const ok = await isSuperAdminSessionWithSharePointFallback(session);
  if (!ok) throw new Error('Forbidden');
  return session;
}
