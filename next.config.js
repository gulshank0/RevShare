/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  images: {
    domains: [
      'yt3.ggpht.com', // YouTube channel thumbnails
      'i.ytimg.com',   // YouTube video thumbnails
    ],
  },
};

module.exports = nextConfig;