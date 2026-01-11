/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow ESLint warnings during build (only errors will fail)
  eslint: {
    ignoreDuringBuilds: false,
    // Warnings won't fail the build, only errors will
  },
  typescript: {
    ignoreBuildErrors: false,
  },
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
