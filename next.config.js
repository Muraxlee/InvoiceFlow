/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
    ],
  },
  // This is the correct way to handle packages that should not be bundled for server-side environments
  serverExternalPackages: ['sqlite3', 'better-sqlite3', 'bcrypt'],
  experimental: {
    serverActions: {
      // Add your Electron app's origin if server actions are used from the renderer
      // For development, if your Next.js app runs on 9002 and Electron serves it
      allowedOrigins: ['localhost:9002'], 
    },
  },
};

module.exports = nextConfig;
