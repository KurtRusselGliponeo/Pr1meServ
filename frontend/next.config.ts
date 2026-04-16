import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Server Components by default (App Router)
  reactStrictMode: true,
  transpilePackages: ['@a1prime/schemas'],
  // Absolute imports from /src
  typedRoutes: true,
  // Customize environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080',
  },
};

export default nextConfig;
