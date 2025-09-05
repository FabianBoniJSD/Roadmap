/**
 * Next.js config
 * - Removed static export so API routes (proxy) function.
 * - Removed global trailingSlash because it induces 308 redirects on API endpoints like /api/sharepoint/_api/contextinfo.
 * - Keep basePath only if you truly deploy under a sub-path; otherwise set to ''.
 */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true }, // can stay if you host on-prem without Image Optimization infra
  trailingSlash: false,
  basePath: process.env.NODE_ENV === 'production'
    ? '' // adjust if still served under a nested path; currently root simplifies proxy calls
    : ''
};

module.exports = nextConfig;