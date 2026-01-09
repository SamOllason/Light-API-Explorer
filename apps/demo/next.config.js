/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  transpilePackages: ['@light-faux/sdk'],

  // For GitHub Pages static export in production only
  output: 'export',

  // Use basePath/assetPrefix only when building for production (static host)
  basePath: isProd ? '/Light-API-Explorer' : undefined,
  assetPrefix: isProd ? '/Light-API-Explorer/' : undefined,

  // Disable image optimization (not supported in static export)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
