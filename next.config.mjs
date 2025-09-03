const deploymentEnv = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || process.env.NODE_ENV || 'development';
const resolvedBasePath = deploymentEnv === 'production'
  ? (process.env.NEXT_PUBLIC_BASE_PATH_PROD || '/JSD/QMServices/Roadmap/roadmapapp')
  : (process.env.NEXT_PUBLIC_BASE_PATH_DEV || '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: resolvedBasePath.replace(/\/$/, ''),
  assetPrefix: resolvedBasePath ? resolvedBasePath.replace(/\/$/, '') + '/' : undefined,
  async redirects() {
    // Redirect root '/' to the basePath when basePath is set (production) to avoid 404
    if (resolvedBasePath && resolvedBasePath !== '/') {
      return [
        {
          source: '/',
          destination: resolvedBasePath.endsWith('/') ? resolvedBasePath : `${resolvedBasePath}/`,
          permanent: false,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
