
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
      allowedOrigins: ['localhost:9002'],
    },
    serverComponentsExternalPackages: ['sqlite3', 'better-sqlite3'],
  },
  output: 'export', // Ensures static export for Electron
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent bundling of Node.js core modules and problematic native deps on client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        net: false,
        tls: false,
        child_process: false,
        dns: false,
        async_hooks: false,
        // Explicitly exclude native modules if they still cause issues
        'sqlite3': false,
        'better-sqlite3': false,
        'electron': false, 
        'bindings': false, // Often a dependency of native modules
      };
    }
    // Important: return the modified config
    return config;
  },
};

export default nextConfig;
