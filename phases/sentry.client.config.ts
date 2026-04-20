// frontend/sentry.client.config.ts
// This file is loaded automatically by Next.js on the client side.
// It initializes Sentry for browser error tracking.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Capture 10 % of transactions for performance monitoring
  tracesSampleRate: 0.1,

  // Session replay: capture 5 % of sessions, 100 % of sessions with errors
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and inputs by default for GDPR compliance
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  environment: process.env.NODE_ENV,

  beforeSend(event) {
    // Strip any PII fields from the event payload
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
});
