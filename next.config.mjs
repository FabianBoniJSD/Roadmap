const deploymentEnv =
  process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || process.env.NODE_ENV || 'development';
const rawBasePath =
  deploymentEnv === 'production'
    ? process.env.NEXT_PUBLIC_BASE_PATH_PROD || ''
    : process.env.NEXT_PUBLIC_BASE_PATH_DEV || '';
// Normalize: remove trailing slash EXCEPT keep single leading slash when non-empty
const resolvedBasePath = (rawBasePath || '').replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  transpilePackages: ['@roadmap/entra-sso'],
  // trailingSlash false avoids 308 redirects that can break API & chunk URLs on some reverse proxies / SharePoint
  trailingSlash: false,
  basePath: resolvedBasePath,
  async redirects() {
    // Redirect root '/' to the basePath when basePath is set (production) to avoid 404
    if (resolvedBasePath && resolvedBasePath !== '/') {
      return [
        {
          source: '/',
          destination: resolvedBasePath,
          permanent: false,
        },
      ];
    }
    return [];
  },
  webpack(config) {
    // Lightweight runtime debug to confirm which config file got applied (printed at build time)
    if (!process.env.SUPPRESS_CONFIG_LOG) {
      console.log(
        '[next.config] Using basePath=%s assetPrefix=%s trailingSlash=%s env=%s',
        resolvedBasePath || '(none)',
        resolvedBasePath || '(none)',
        false,
        deploymentEnv
      );
    }
    return config;
  },
};

export default nextConfig;
