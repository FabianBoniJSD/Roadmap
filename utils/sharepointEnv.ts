// Utility to resolve the correct SharePoint Site URL based on environment variables
// Falls back to dev URL if prod not set or env not production.
export function resolveSharePointSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || process.env.NODE_ENV || 'development';
  const dev = process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL_DEV || 'https://spi.intranet.bs.ch/JSD/Digital';
  const prod = process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL_PROD || dev;
  return (env === 'production' ? prod : dev).replace(/\/$/, '');
}
