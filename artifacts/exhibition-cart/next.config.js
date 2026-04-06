/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure we can handle images from external sources if needed
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
