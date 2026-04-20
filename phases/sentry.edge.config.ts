// frontend/sentry.server.config.ts
// This file is loaded automatically by Next.js on the server side (Node.js runtime).
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === 'production',

  // Lower sample rate for server-side traces to reduce noise
  tracesSampleRate: 0.05,

  environment: process.env.NODE_ENV,
});
