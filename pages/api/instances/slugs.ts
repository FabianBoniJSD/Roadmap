import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/utils/apiAuth';
import { getInstanceSlugsFromPrincipal, isSuperAdminPrincipal } from '@/utils/instanceAccess';
import { isReadSessionAllowedForInstance } from '@/utils/instanceAccessServer';
import { isSuperAdminSessionWithSharePointFallback } from '@/utils/superAdminAccessServer';

const HTTP_URL_REGEX = /^https?:\/\//i;

type MetadataRecord = Record<string, unknown>;

const isRecord = (value: unknown): MetadataRecord | undefined => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as MetadataRecord;
  }
  return undefined;
};

const toTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const firstStringFromArray = (value: unknown): string | null => {
  if (!Array.isArray(value)) return null;
  for (const entry of value) {
    const candidate = toTrimmedString(entry);
    if (candidate) return candidate;
  }
  return null;
};

const parseMetadata = (settingsJson?: string | null): MetadataRecord | undefined => {
  if (!settingsJson) return undefined;
  try {
    const parsed = JSON.parse(settingsJson);
    const parsedRecord = isRecord(parsed);
    const metadataCandidate = parsedRecord?.metadata;
    return isRecord(metadataCandidate);
  } catch {
    return undefined;
  }
};

const buildTargetFromHost = (hostValue: string | null, path?: string | null): string | null => {
  if (!hostValue) return null;
  const trimmed = hostValue.trim();
  if (!trimmed) return null;
  const normalizedPath = path ? `/${path.replace(/^\/+/, '')}` : '';
  if (HTTP_URL_REGEX.test(trimmed)) {
    return `${trimmed.replace(/\/$/, '')}${normalizedPath}`;
  }
  if (trimmed.startsWith('//')) {
    return `${trimmed.replace(/\/$/, '')}${normalizedPath}`;
  }
  if (trimmed.startsWith('/')) {
    const base = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
    return `${base}${normalizedPath}`;
  }
  const sanitizedHost = trimmed.replace(/\/+$/, '');
  return `//${sanitizedHost}${normalizedPath}`;
};

const resolveFrontendTarget = (settingsJson: string | null, hosts: string[]): string | null => {
  const metadata = parseMetadata(settingsJson);
  const frontendConfig = isRecord(metadata?.frontend);
  const directUrl = toTrimmedString(metadata?.frontendUrl) || toTrimmedString(frontendConfig?.url);
  if (directUrl) {
    return directUrl;
  }
  const hostCandidate =
    toTrimmedString(metadata?.frontendHost) ||
    firstStringFromArray(metadata?.frontendHosts) ||
    toTrimmedString(frontendConfig?.host) ||
    hosts[0] ||
    null;
  if (!hostCandidate) return null;
  const pathCandidate =
    toTrimmedString(metadata?.frontendPath) || toTrimmedString(frontendConfig?.path) || null;
  return buildTargetFromHost(hostCandidate, pathCandidate);
};

const toInstanceOption = (record: { slug: string; displayName: string | null }) => ({
  slug: record.slug,
  displayName: record.displayName || record.slug,
});

const toLandingInstance = (record: {
  slug: string;
  displayName: string | null;
  department: string | null;
  description: string | null;
  sharePointSiteUrlProd: string | null;
  sharePointSiteUrlDev: string;
  sharePointStrategy: string | null;
  settingsJson: string | null;
  landingPage: string | null;
  hosts: Array<{ host: string }>;
}) => {
  const hosts = record.hosts.map((host) => host.host);
  return {
    slug: record.slug,
    displayName: record.displayName || record.slug,
    department: record.department ?? null,
    description: record.description ?? null,
    sharePointUrl: (record.sharePointSiteUrlProd || record.sharePointSiteUrlDev).replace(/\/$/, ''),
    strategy: record.sharePointStrategy || 'kerberos',
    hosts,
    frontendTarget: resolveFrontendTarget(record.settingsJson ?? null, hosts),
    landingPage: record.landingPage ?? null,
  };
};

const instanceQuery = {
  select: {
    slug: true,
    displayName: true,
    department: true,
    description: true,
    sharePointSiteUrlProd: true,
    sharePointSiteUrlDev: true,
    sharePointStrategy: true,
    settingsJson: true,
    landingPage: true,
    hosts: {
      select: {
        host: true,
      },
    },
  },
} as const;

/**
 * Public endpoint: returns minimal instance identifiers (slug + displayName) for UI switching.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const details = String(req.query.details || '').toLowerCase() === 'landing';
    let session;
    try {
      session = requireAdminSession(req);
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const username =
      (typeof session?.username === 'string' && session.username) ||
      (typeof session?.displayName === 'string' && session.displayName) ||
      null;

    const principal = { username, groups: session?.groups };
    const forwardedHeaders = {
      authorization:
        typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
      cookie: typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined,
    };
    const tokenSuperAdmin = isSuperAdminPrincipal(principal);
    const isSuperAdmin =
      tokenSuperAdmin || (await isSuperAdminSessionWithSharePointFallback(session));

    // Fast path: token already contains instance groups.
    const tokenAllowedSlugs = isSuperAdmin ? null : getInstanceSlugsFromPrincipal(principal);
    if (tokenAllowedSlugs && tokenAllowedSlugs.length > 0) {
      const records = await prisma.roadmapInstance.findMany({
        ...instanceQuery,
        where: { slug: { in: tokenAllowedSlugs } },
        orderBy: { slug: 'asc' },
      });
      const instances = details
        ? records.map((r) => toLandingInstance(r))
        : records.map((r) => toInstanceOption(r));
      return res.status(200).json({ instances });
    }

    // Fallback: if no implicit groups are present in the JWT, verify membership in
    // SharePoint site group "admin-<slug>" for each instance.
    const allRecords = await prisma.roadmapInstance.findMany({
      ...instanceQuery,
      orderBy: { slug: 'asc' },
    });

    if (isSuperAdmin) {
      const instances = details
        ? allRecords.map((r) => toLandingInstance(r))
        : allRecords.map((r) => toInstanceOption(r));
      return res.status(200).json({ instances });
    }

    const checks = await Promise.all(
      allRecords.map(async (r) => ({
        record: r,
        allowed: await isReadSessionAllowedForInstance({
          session,
          instance: { slug: r.slug },
          requestHeaders: forwardedHeaders,
        }),
      }))
    );

    const instances = checks
      .filter((c) => c.allowed)
      .map((c) => (details ? toLandingInstance(c.record) : toInstanceOption(c.record)));

    return res.status(200).json({ instances });
  } catch (error) {
    console.error('[instances:slugs] failed to load slugs', error);
    return res.status(500).json({ error: 'Failed to load instances' });
  }
}
