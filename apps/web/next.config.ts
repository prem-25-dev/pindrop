import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@pinpoint/ui'],
  reactStrictMode: true,
  poweredByHeader: false,
};

export default config;
