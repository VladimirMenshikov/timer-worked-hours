/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  generateBuildId: async () => {
    // Use commit hash if available, otherwise a stable build id
    return process.env.GIT_COMMIT_SHA || 'build-' + Date.now();
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
