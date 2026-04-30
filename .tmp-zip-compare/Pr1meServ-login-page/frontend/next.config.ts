import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@a1prime/schemas'],
  typedRoutes: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080',
  },
};

function withOptionalSentry(config: NextConfig): NextConfig {
  try {
    const { withSentryConfig } = require('@sentry/nextjs') as {
      withSentryConfig: (cfg: NextConfig, options: Record<string, unknown>) => NextConfig;
    };

    return withSentryConfig(config, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      disableLogger: true,
      tunnelRoute: '/monitoring',
      hideSourceMaps: true,
    });
  } catch {
    return config;
  }
}

export default withOptionalSentry(nextConfig);
