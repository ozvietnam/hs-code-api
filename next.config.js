/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cho phép import JSON lớn
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    return config;
  },
};

module.exports = nextConfig;
