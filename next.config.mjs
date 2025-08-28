/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removed static export to enable API routes
  images: { unoptimized: true }, // keep if you still deploy where Image Optimization isn't available
  trailingSlash: true,
  basePath: process.env.NODE_ENV === 'production' ? '/JSD/QMServices/Roadmap/roadmapapp' : '',
};

export default nextConfig;
