import path from 'node:path';
import { fileURLToPath } from 'node:url';

const deploymentEnv =
  process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || process.env.NODE_ENV || 'development';
const rawBasePath =
  deploymentEnv === 'production'
    ? process.env.NEXT_PUBLIC_BASE_PATH_PROD || ''
    : process.env.NEXT_PUBLIC_BASE_PATH_DEV || '';
// Normalize: remove trailing slash EXCEPT keep single leading slash when non-empty
const resolvedBasePath = (rawBasePath || '').replace(/\/$/, '');
const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  ...(isProduction
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : []),
];

if (!process.env.SUPPRESS_CONFIG_LOG) {
  console.log(
    '[next.config] Using basePath=%s trailingSlash=%s env=%s turbopackRoot=%s',
    resolvedBasePath || '(none)',
    false,
    deploymentEnv,
    workspaceRoot
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  transpilePackages: ['@roadmap/entra-sso'],
  turbopack: {
    root: workspaceRoot,
  },
  // trailingSlash false avoids 308 redirects that can break API & chunk URLs on some reverse proxies / SharePoint
  trailingSlash: false,
  basePath: resolvedBasePath,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  async rewrites() {
    // Serve the existing documentation at its linked entry URLs without changing the address.
    return [
      { source: '/docs', destination: '/docs/pages' },
      { source: '/docs/erste-schritte', destination: '/docs/erste-schritte/uebersicht' },
    ];
  },
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
};

export default nextConfig;
