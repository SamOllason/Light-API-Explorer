/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@light-faux/sdk'],
  
  // For GitHub Pages static export
  output: 'export',
  
  // Deploying to https://samollason.github.io/Light-API-Explorer/
  basePath: '/Light-API-Explorer',
  assetPrefix: '/Light-API-Explorer/',
  
  // Disable image optimization (not supported in static export)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
