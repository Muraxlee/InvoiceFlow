
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
  experimental: {
    serverActions: {
      // Add your Electron app's origin if server actions are used from the renderer
      // For development, if your Next.js app runs on 9002 and Electron serves it
      allowedOrigins: ['localhost:9002'], 
    },
    // This is the Turbopack-friendly way to handle packages
    // that should not be bundled for server-side environments
    // (Server Components, Route Handlers, Server Actions).
    serverComponentsExternalPackages: ['sqlite3', 'better-sqlite3', 'bcrypt'],
  },
};

export default nextConfig;
