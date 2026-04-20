// frontend/next.config.ts
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@a1prime/schemas'],
  typedRoutes: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080',
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry organization and project (set in CI environment)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in CI to avoid leaking them locally
  silent: !process.env.CI,
  uploadSourceMaps: process.env.CI === 'true',

  // Automatically tree-shake Sentry logger statements in production
  disableLogger: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad blockers
  tunnelRoute: '/monitoring',

  // Hides source maps from generated client bundles
  hideSourceMaps: true,
});
