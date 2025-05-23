/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:9002'],
    },
  },
  images: {
    domains: ['placehold.co'],
  },
  webpack: (config, { isServer }) => {
    // Only on the server-side
    if (isServer) {
      // Handle SQLite modules
      config.externals = [...config.externals, 'sqlite3', 'better-sqlite3'];
    }

    return config;
  }
}

module.exports = nextConfig; 