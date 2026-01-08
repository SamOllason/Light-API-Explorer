/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@light-faux/sdk'],
  
  // For GitHub Pages static export
  output: 'export',
  
  // Deploying to https://samollason.github.io/Light-demo-SDK-exploring/
  basePath: '/Light-demo-SDK-exploring',
  assetPrefix: '/Light-demo-SDK-exploring/',
  
  // Disable image optimization (not supported in static export)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
