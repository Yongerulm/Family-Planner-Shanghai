/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Alle API-Requests gehen an den Backend-Container
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://api:3000'}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
