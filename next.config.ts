import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone режим для Docker
  output: 'standalone',

  // Настройки для обработки внешних пакетов
  experimental: {
    serverComponentsExternalPackages: ['sqlite3', 'fluent-ffmpeg'],
  },
};

export default nextConfig;
