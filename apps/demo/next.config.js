/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@light-faux/sdk'],
  
  // For GitHub Pages static export
  output: 'export',
  
  // Deploying to https://<username>.github.io/light-faux-sdk/
  basePath: '/light-faux-sdk',
  assetPrefix: '/light-faux-sdk/',
  
  // Disable image optimization (not supported in static export)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
