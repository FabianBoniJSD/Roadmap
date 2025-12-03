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

async function main() {
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
