import type { NextApiRequest } from 'next';
import type { IncomingMessage } from 'http';
import type { RoadmapInstance as PrismaRoadmapInstance, RoadmapInstanceHost } from '@prisma/client';
import prisma from '@/lib/prisma';
import type {
  RoadmapInstanceConfig,
  RoadmapInstanceFeatureFlags,
  RoadmapInstanceSharePointSettings,
  RoadmapInstanceSummary,
} from '@/types/roadmapInstance';

export const INSTANCE_COOKIE_NAME = 'roadmap-instance';
export const INSTANCE_QUERY_PARAM = 'roadmapInstance';
const INSTANCE_HEADER = 'x-roadmap-instance';
const DEFAULT_INSTANCE_SLUG = (process.env.DEFAULT_ROADMAP_INSTANCE || 'default').toLowerCase();
const CACHE_TTL_MS = Math.max(
  Number.parseInt(process.env.INSTANCE_CACHE_TTL_MS || '30000', 10),
  5000
);

type ApiRequestLike =
  | Pick<NextApiRequest, 'headers' | 'cookies' | 'query'>
  | (IncomingMessage & {
      cookies?: Record<string, string>;
      query?: Record<string, string | string[]>;
    });

type CachedInstance = { expires: number; config: RoadmapInstanceConfig };
const instanceCache = new Map<string, CachedInstance>();

type HeadersWithGet = { get(name: string): string | null };
type FeatureValue = string | number | boolean | null;

const isHeadersWithGet = (value: unknown): value is HeadersWithGet => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Partial<HeadersWithGet>).get === 'function'
  );
};

const coerceFeatureFlags = (value: unknown): RoadmapInstanceFeatureFlags | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return {};

  const result: RoadmapInstanceFeatureFlags = {};
  for (const [flag, raw] of entries) {
    if (
      typeof raw === 'string' ||
      typeof raw === 'number' ||
      typeof raw === 'boolean' ||
      raw === null
    ) {
      result[flag] = raw as FeatureValue;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

const normalizeSlug = (value?: string | null): string | null => {
  if (!value) return null;
  return value.trim().toLowerCase() || null;
};

const parseCookieHeader = (raw?: string): Record<string, string> => {
  if (!raw) return {};
  return raw.split(';').reduce<Record<string, string>>((acc, pair) => {
    const [key, ...rest] = pair.split('=');
    if (!key) return acc;
    acc[key.trim()] = decodeURIComponent(rest.join('=').trim());
    return acc;
  }, {});
};

const getHeaderValue = (req: ApiRequestLike, key: string): string | undefined => {
  const headers = req.headers || {};
  if (isHeadersWithGet(headers)) {
    return headers.get(key) ?? undefined;
  }
  const headerValue = (headers as Record<string, string | string[] | undefined>)[key];
  if (Array.isArray(headerValue)) return headerValue[0];
  return headerValue;
};

const readCache = (key: string): RoadmapInstanceConfig | null => {
  const cached = instanceCache.get(key);
  if (!cached) return null;
  if (cached.expires < Date.now()) {
    instanceCache.delete(key);
    return null;
  }
  return cached.config;
};

const writeCache = (config: RoadmapInstanceConfig) => {
  const payload: CachedInstance = { config, expires: Date.now() + CACHE_TTL_MS };
  instanceCache.set(`slug:${config.slug}`, payload);
  for (const host of config.hosts) {
    instanceCache.set(`host:${host}`, payload);
  }
};

const decodeSettings = (
  settingsJson: PrismaRoadmapInstance['settingsJson']
): Record<string, unknown> | undefined => {
  if (!settingsJson) return undefined;
  try {
    const parsed = JSON.parse(settingsJson);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore parse errors
  }
  return undefined;
};

export type PrismaInstanceWithHosts = PrismaRoadmapInstance & { hosts: RoadmapInstanceHost[] };

export const mapInstanceRecord = (record: PrismaInstanceWithHosts): RoadmapInstanceConfig => {
  const settingsObj = decodeSettings(record.settingsJson);
  const sharePoint: RoadmapInstanceSharePointSettings = {
    siteUrlDev: record.sharePointSiteUrlDev,
    siteUrlProd: record.sharePointSiteUrlProd || record.sharePointSiteUrlDev,
    strategy: record.sharePointStrategy || 'onprem',
    username: record.spUsername || undefined,
    password: record.spPassword || undefined,
    domain: record.spDomain || undefined,
    workstation: record.spWorkstation || undefined,
    allowSelfSigned: record.allowSelfSigned,
    needsProxy: record.needsProxy,
    extraModes: (record.extraAuthModes || '')
      .split(',')
      .map((mode) => mode.trim().toLowerCase())
      .filter(Boolean),
    forceSingleCreds: record.forceSingleCreds,
    authNoCache: record.authNoCache,
    manualNtlmFallback: record.manualNtlmFallback,
    ntlmPersistentSocket: record.ntlmPersistentSocket,
    ntlmSocketProbe: record.ntlmSocketProbe,
    trustedCaPath: record.trustedCaPath || undefined,
  };

  const theme =
    settingsObj?.theme && typeof settingsObj.theme === 'object'
      ? (settingsObj.theme as Record<string, string>)
      : undefined;
  const features: RoadmapInstanceFeatureFlags | undefined = coerceFeatureFlags(
    settingsObj?.features
  );
  const metadata =
    settingsObj?.metadata && typeof settingsObj.metadata === 'object'
      ? (settingsObj.metadata as Record<string, unknown>)
      : undefined;

  return {
    id: record.id,
    slug: record.slug,
    displayName: record.displayName,
    department: record.department || undefined,
    description: record.description || undefined,
    deploymentEnv: record.deploymentEnv || undefined,
    defaultLocale: record.defaultLocale || undefined,
    defaultTimeZone: record.defaultTimeZone || undefined,
    hosts: record.hosts.map((host) => host.host),
    sharePoint,
    theme,
    features,
    metadata,
    settingsRaw: settingsObj,
  };
};

const fetchInstanceBySlug = async (slug: string): Promise<RoadmapInstanceConfig | null> => {
  const cached = readCache(`slug:${slug}`);
  if (cached) return cached;
  const record = await prisma.roadmapInstance.findUnique({
    where: { slug },
    include: { hosts: true },
  });
  if (!record) return null;
  const config = mapInstanceRecord(record);
  writeCache(config);
  return config;
};

const fetchInstanceByHost = async (host: string): Promise<RoadmapInstanceConfig | null> => {
  const cached = readCache(`host:${host}`);
  if (cached) return cached;
  const record = await prisma.roadmapInstanceHost.findUnique({
    where: { host },
    include: {
      instance: {
        include: { hosts: true },
      },
    },
  });
  if (!record?.instance) return null;
  const config = mapInstanceRecord(record.instance);
  writeCache(config);
  return config;
};

const extractSlugFromRequest = (req: ApiRequestLike): string | null => {
  if ('query' in req && req.query) {
    const queryValue = req.query[INSTANCE_QUERY_PARAM];
    if (typeof queryValue === 'string') return normalizeSlug(queryValue);
    if (Array.isArray(queryValue) && queryValue.length > 0) {
      return normalizeSlug(queryValue[0]);
    }
  }
  const headerSlug = normalizeSlug(getHeaderValue(req, INSTANCE_HEADER));
  if (headerSlug) return headerSlug;

  const cookies =
    req.cookies && Object.keys(req.cookies).length > 0
      ? req.cookies
      : parseCookieHeader(getHeaderValue(req, 'cookie'));
  const cookieSlug = normalizeSlug(cookies?.[INSTANCE_COOKIE_NAME]);
  if (cookieSlug) return cookieSlug;
  return null;
};

const extractHostFromRequest = (req: ApiRequestLike): string | null => {
  const forwardedHost = getHeaderValue(req, 'x-forwarded-host');
  const host = forwardedHost || getHeaderValue(req, 'host');
  if (!host) return null;
  return host.split(':')[0].trim().toLowerCase();
};

export async function getInstanceConfigBySlug(slug: string): Promise<RoadmapInstanceConfig | null> {
  return fetchInstanceBySlug(slug.toLowerCase());
}

export async function getInstanceConfigFromRequest(
  req: ApiRequestLike,
  options: { optional?: boolean; fallbackToDefault?: boolean } = {}
): Promise<RoadmapInstanceConfig | null> {
  const preferSlug = extractSlugFromRequest(req);
  if (preferSlug) {
    const instance = await fetchInstanceBySlug(preferSlug);
    if (instance) return instance;
  }

  const host = extractHostFromRequest(req);
  if (host) {
    const instance = await fetchInstanceByHost(host);
    if (instance) return instance;
  }

  if (options.fallbackToDefault === false) {
    return null;
  }

  const fallback = await fetchInstanceBySlug(DEFAULT_INSTANCE_SLUG);
  if (!fallback && !options.optional) {
    throw new Error(
      `Roadmap instance "${DEFAULT_INSTANCE_SLUG}" not found. Seed the database or set DEFAULT_ROADMAP_INSTANCE.`
    );
  }
  return fallback;
}

export function toInstanceSummary(config: RoadmapInstanceConfig): RoadmapInstanceSummary {
  const { sharePoint, ...rest } = config;
  return {
    ...rest,
    sharePoint: {
      ...sharePoint,
      usernameSet: Boolean(sharePoint.username),
      passwordSet: Boolean(sharePoint.password),
    },
  };
}

export function maskSharePointSecrets(settings: RoadmapInstanceSharePointSettings) {
  return {
    ...settings,
    username: settings.username ? '***' : undefined,
    password: settings.password ? '***' : undefined,
  };
}

export function setInstanceCookieHeader(slug: string): string {
  const safeSlug = normalizeSlug(slug) || DEFAULT_INSTANCE_SLUG;
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  return `${INSTANCE_COOKIE_NAME}=${safeSlug}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function shouldSkipSharePointCache(config?: RoadmapInstanceConfig | null): boolean {
  if (!config) return false;
  return Boolean(config.sharePoint.authNoCache || config.sharePoint.forceSingleCreds);
}
