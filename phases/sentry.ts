// backend/src/plugins/sentry.ts
// Initializes Sentry on the backend for unhandled error tracking.
// Register this plugin BEFORE route plugins so all errors are captured.
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import type { FastifyPluginAsync } from 'fastify';

const sentryPlugin: FastifyPluginAsync = async (app) => {
  // Only initialize when DSN is present (skip in local dev / tests)
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    enabled: process.env.NODE_ENV === 'production',
    environment: process.env.NODE_ENV ?? 'development',

    // Capture 5 % of transactions for performance monitoring
    tracesSampleRate: 0.05,

    // Profile 10 % of sampled transactions
    profilesSampleRate: 0.1,

    integrations: [
      nodeProfilingIntegration(),
    ],

    beforeSend(event) {
      // Strip user email from Sentry payloads (GDPR)
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });

  // Capture unhandled rejections and uncaught exceptions at the process level
  process.on('unhandledRejection', (reason) => {
    Sentry.captureException(reason);
  });

  // Add Sentry error reporting to Fastify's error hook
  app.addHook('onError', async (_request, _reply, error) => {
    // Only report 5xx errors — client errors (4xx) are expected
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    if (statusCode >= 500) {
      Sentry.captureException(error);
    }
  });

  app.log.info('Sentry initialized for backend error tracking.');
};

export default sentryPlugin;
