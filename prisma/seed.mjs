/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const boolEnv = (key, fallback = false) => {
  const value = process.env[key];
  if (typeof value !== 'string') return fallback;
  if (value === '1') return true;
  if (value === '0') return false;
  return value.trim().toLowerCase() === 'true';
};

const readJsonArray = (raw) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    console.warn('[prisma:seed] ROADMAP_SEED_INSTANCES is not a JSON array. Ignoring.');
  } catch (error) {
    console.error('[prisma:seed] Failed to parse ROADMAP_SEED_INSTANCES:', error);
  }
  return null;
};

const normalizeString = (value, { lowercase = false } = {}) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return lowercase ? trimmed.toLowerCase() : trimmed;
};

const toBool = (value, fallback) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
};

const getServiceAccount = (definition) => {
  const username =
    normalizeString(definition?.spUsername) || normalizeString(process.env.SP_USERNAME);
  const password =
    normalizeString(definition?.spPassword) || normalizeString(process.env.SP_PASSWORD);
  if (!username || !password) {
    throw new Error(
      `Missing SharePoint credentials for instance "${definition?.slug || 'unknown'}". ` +
        'Provide spUsername/spPassword in ROADMAP_SEED_INSTANCES or set SP_USERNAME/SP_PASSWORD.'
    );
  }
  return {
    username,
    password,
    domain:
      normalizeString(definition?.spDomain) ??
      normalizeString(process.env.SP_ONPREM_DOMAIN) ??
      null,
    workstation:
      normalizeString(definition?.spWorkstation) ??
      normalizeString(process.env.SP_ONPREM_WORKSTATION) ??
      null,
  };
};

const coerceExtraAuthModes = (value) => {
  if (!value) return normalizeString(process.env.SP_AUTH_EXTRA) || null;
  if (typeof value === 'string') return normalizeString(value) || null;
  if (Array.isArray(value)) {
    const joined = value
      .map((mode) => normalizeString(mode, { lowercase: true }))
      .filter(Boolean)
      .join(', ');
    return joined || null;
  }
  return null;
};

const toSettingsJson = (definition) => {
  if (definition?.settingsJson !== undefined) {
    return typeof definition.settingsJson === 'string'
      ? definition.settingsJson
      : JSON.stringify(definition.settingsJson);
  }

  const themePrimary =
    definition?.theme?.primaryColor || process.env.NEXT_PUBLIC_THEME_PRIMARY || '#005a9c';
  const themeAccent =
    definition?.theme?.accentColor || process.env.NEXT_PUBLIC_THEME_ACCENT || '#00b7c3';

  const attachmentsDefault = boolEnv('NEXT_PUBLIC_FEATURE_ATTACHMENTS', true);
  const analyticsDefault = boolEnv('NEXT_PUBLIC_FEATURE_ANALYTICS', false);

  const features = {
    attachments:
      definition?.features?.attachments !== undefined
        ? Boolean(definition.features.attachments)
        : attachmentsDefault,
    analytics:
      definition?.features?.analytics !== undefined
        ? Boolean(definition.features.analytics)
        : analyticsDefault,
  };

  const payload = {
    theme: {
      primaryColor: themePrimary,
      accentColor: themeAccent,
    },
    features,
  };

  if (definition?.metadata !== undefined) {
    payload.metadata = definition.metadata;
  }

  return JSON.stringify(payload);
};

const syncInstancesFromEnv = async () => {
  const definitions = readJsonArray(process.env.ROADMAP_SEED_INSTANCES);
  if (!definitions || definitions.length === 0) return false;

  let created = 0;
  let updated = 0;

  for (const rawDef of definitions) {
    const slug = normalizeString(rawDef?.slug, { lowercase: true });
    const sharePointDev =
      normalizeString(rawDef?.sharePointSiteUrlDev) || normalizeString(rawDef?.sharePointSiteUrl);

    if (!slug || !sharePointDev) {
      console.warn(
        '[prisma:seed] Skipping instance definition without slug/sharePointSiteUrlDev.',
        rawDef
      );
      continue;
    }

    const sharePointProd = normalizeString(rawDef?.sharePointSiteUrlProd) || sharePointDev;

    let serviceAccount;
    try {
      serviceAccount = getServiceAccount({ ...rawDef, slug });
    } catch (error) {
      console.error('[prisma:seed]', error.message);
      continue;
    }

    const allowSelfSigned = toBool(rawDef?.allowSelfSigned, boolEnv('SP_ALLOW_SELF_SIGNED'));
    const needsProxy = toBool(rawDef?.needsProxy, boolEnv('SP_NODE_SP_AUTH_NEEDS_PROXY'));
    const forceSingleCreds = toBool(rawDef?.forceSingleCreds, boolEnv('SP_FORCE_SINGLE_CREDS'));
    const authNoCache = toBool(rawDef?.authNoCache, boolEnv('SP_AUTH_NO_CACHE'));
    const manualNtlmFallback = toBool(
      rawDef?.manualNtlmFallback,
      boolEnv('SP_MANUAL_NTLM_FALLBACK')
    );
    const ntlmPersistentSocket = toBool(
      rawDef?.ntlmPersistentSocket,
      boolEnv('SP_NTLM_PERSISTENT_SOCKET')
    );
    const ntlmSocketProbe = toBool(rawDef?.ntlmSocketProbe, boolEnv('SP_NTLM_SOCKET_PROBE'));

    const data = {
      slug,
      displayName: normalizeString(rawDef?.displayName) || slug.toUpperCase(),
      department: normalizeString(rawDef?.department) || null,
      description: normalizeString(rawDef?.description) || null,
      sharePointSiteUrlDev: sharePointDev.replace(/\/$/, ''),
      sharePointSiteUrlProd: sharePointProd.replace(/\/$/, ''),
      sharePointStrategy:
        normalizeString(rawDef?.sharePointStrategy) ||
        normalizeString(process.env.SP_STRATEGY) ||
        'onprem',
      spUsername: serviceAccount.username,
      spPassword: serviceAccount.password,
      spDomain: serviceAccount.domain,
      spWorkstation: serviceAccount.workstation,
      allowSelfSigned,
      needsProxy,
      forceSingleCreds,
      authNoCache,
      manualNtlmFallback,
      ntlmPersistentSocket,
      ntlmSocketProbe,
      extraAuthModes: coerceExtraAuthModes(rawDef?.extraAuthModes),
      trustedCaPath:
        normalizeString(rawDef?.trustedCaPath) ||
        normalizeString(process.env.SP_TRUSTED_CA_PATH) ||
        null,
      deploymentEnv:
        normalizeString(rawDef?.deploymentEnv) ||
        normalizeString(process.env.NEXT_PUBLIC_DEPLOYMENT_ENV) ||
        null,
      defaultLocale:
        normalizeString(rawDef?.defaultLocale) ||
        normalizeString(process.env.NEXT_PUBLIC_DEFAULT_LOCALE) ||
        null,
      defaultTimeZone:
        normalizeString(rawDef?.defaultTimeZone) ||
        normalizeString(process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE) ||
        null,
      landingPage: normalizeString(rawDef?.landingPage) || null,
      settingsJson: toSettingsJson(rawDef),
    };

    const hostList = Array.isArray(rawDef?.hosts)
      ? rawDef.hosts.map((host) => normalizeString(host, { lowercase: true })).filter(Boolean)
      : [];

    const existing = await prisma.roadmapInstance.findUnique({
      where: { slug },
      include: { hosts: true },
    });

    if (existing) {
      await prisma.roadmapInstance.update({
        where: { id: existing.id },
        data: {
          ...data,
          hosts: hostList.length
            ? {
                deleteMany: {},
                create: hostList.map((host) => ({ host })),
              }
            : undefined,
        },
      });
      updated += 1;
      console.log(`[prisma:seed] Updated roadmap instance "${slug}".`);
    } else {
      await prisma.roadmapInstance.create({
        data: {
          ...data,
          hosts: hostList.length ? { create: hostList.map((host) => ({ host })) } : undefined,
        },
      });
      created += 1;
      console.log(`[prisma:seed] Created roadmap instance "${slug}".`);
    }
  }

  console.log(`[prisma:seed] Instance sync complete. Created=${created}, Updated=${updated}.`);
  return true;
};

async function main() {
  const synced = await syncInstancesFromEnv();
  if (synced) {
    return;
  }

  const slug = (process.env.DEFAULT_ROADMAP_INSTANCE || 'default').toLowerCase();
  const displayName = process.env.NEXT_PUBLIC_INSTANCE_NAME || 'Default Roadmap';
  const department = process.env.DEFAULT_INSTANCE_DEPARTMENT || null;
  const sharePointDev =
    process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL_DEV ||
    'https://contoso.sharepoint.com/sites/roadmap-dev';
  const sharePointProd = process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL_PROD || sharePointDev;

  const existing = await prisma.roadmapInstance.findUnique({ where: { slug } });
  if (existing) {
    console.log(`[prisma:seed] Roadmap instance "${slug}" already exists. Skipping seed.`);
    return;
  }

  await prisma.roadmapInstance.create({
    data: {
      slug,
      displayName,
      department,
      sharePointSiteUrlDev: sharePointDev,
      sharePointSiteUrlProd: sharePointProd,
      sharePointStrategy: process.env.SP_STRATEGY || 'onprem',
      spUsername: process.env.SP_USERNAME || 'service-account',
      spPassword: process.env.SP_PASSWORD || 'change-me',
      spDomain: process.env.SP_ONPREM_DOMAIN || null,
      spWorkstation: process.env.SP_ONPREM_WORKSTATION || null,
      allowSelfSigned: boolEnv('SP_ALLOW_SELF_SIGNED'),
      needsProxy: boolEnv('SP_NODE_SP_AUTH_NEEDS_PROXY'),
      forceSingleCreds: boolEnv('SP_FORCE_SINGLE_CREDS'),
      authNoCache: boolEnv('SP_AUTH_NO_CACHE'),
      manualNtlmFallback: boolEnv('SP_MANUAL_NTLM_FALLBACK'),
      ntlmPersistentSocket: boolEnv('SP_NTLM_PERSISTENT_SOCKET'),
      ntlmSocketProbe: boolEnv('SP_NTLM_SOCKET_PROBE'),
      extraAuthModes: process.env.SP_AUTH_EXTRA || null,
      trustedCaPath: process.env.SP_TRUSTED_CA_PATH || null,
      deploymentEnv: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || null,
      defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || null,
      defaultTimeZone: process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || null,
      settingsJson: JSON.stringify({
        theme: {
          primaryColor: process.env.NEXT_PUBLIC_THEME_PRIMARY || '#005a9c',
          accentColor: process.env.NEXT_PUBLIC_THEME_ACCENT || '#00b7c3',
        },
        features: {
          attachments: boolEnv('NEXT_PUBLIC_FEATURE_ATTACHMENTS', true),
          analytics: boolEnv('NEXT_PUBLIC_FEATURE_ANALYTICS', false),
        },
      }),
      hosts: {
        create: (process.env.DEFAULT_ROADMAP_HOSTS || '')
          .split(',')
          .map((host) => host.trim().toLowerCase())
          .filter(Boolean)
          .map((host) => ({ host })),
      },
    },
  });

  console.log(`[prisma:seed] Created default roadmap instance "${slug}".`);
}

main()
  .catch((error) => {
    console.error('[prisma:seed] Failed to seed roadmap instances:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
