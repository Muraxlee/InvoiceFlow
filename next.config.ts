
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
        pathname: '/**', // Ensure 'port' is empty string if not needed or remove it
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:9002'],
    },
    // This is the Turbopack-friendly way to handle packages
    // that should not be bundled for server-side environments
    // (Server Components, Route Handlers, Server Actions).
    serverComponentsExternalPackages: ['sqlite3', 'better-sqlite3'],
  },
};

export default nextConfig;
