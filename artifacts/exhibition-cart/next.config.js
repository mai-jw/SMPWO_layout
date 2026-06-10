/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure we can handle images from external sources if needed
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable Next.js devtools overlay to avoid segment-explorer-node.js bundler bug in Next.js 15.5.x
  devIndicators: false,
};

export default nextConfig;
