/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fix for PDF.js canvas issues
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias.canvas = false;
    }
    return config;
  },
  // PDF.js worker headers (handled by Vercel config)
}

module.exports = nextConfig
