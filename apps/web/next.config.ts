import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@pinpoint/ui', '@pinpoint/game'],
  reactStrictMode: true,
  poweredByHeader: false,
  // a self-contained server for the Docker image (deploy/web.Dockerfile); the monorepo root is traced
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
};

export default config;
