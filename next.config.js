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
}

module.exports = nextConfig
