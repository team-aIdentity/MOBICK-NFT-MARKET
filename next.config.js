/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ⚡ 프로덕션 빌드 시 ESLint 경고 무시
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ⚡ 프로덕션 빌드 시 타입 체크 경고 무시
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
