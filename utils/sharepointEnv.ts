import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

// Utility to resolve the correct SharePoint Site URL based on the active roadmap instance.
// Falls back to the global environment configuration if no instance is supplied.
export function resolveSharePointSiteUrl(instance?: RoadmapInstanceConfig | null): string {
  const rawEnv =
    instance?.deploymentEnv ||
    process.env.NEXT_PUBLIC_DEPLOYMENT_ENV ||
    process.env.NODE_ENV ||
    'development';
  const env = String(rawEnv).toLowerCase();
  const isProd = env === 'production' || env === 'prod' || env === 'live';

  const defaultDev =
    process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL_DEV || 'https://spi.intranet.bs.ch/JSD/Digital';
  const dev = instance?.sharePoint.siteUrlDev || defaultDev;
  const prod =
    instance?.sharePoint.siteUrlProd || process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL_PROD || dev;

  const chosen = isProd ? prod : dev;
  return chosen.replace(/\/$/, '');
}
