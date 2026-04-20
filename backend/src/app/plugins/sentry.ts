import type { FastifyPluginAsync } from 'fastify';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const sentryPlugin: FastifyPluginAsync = async (app) => {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    enabled: process.env.NODE_ENV === 'production',
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.05,
    profilesSampleRate: 0.1,
    integrations: [nodeProfilingIntegration()],
    beforeSend(event: Parameters<typeof Sentry.init>[0] extends { beforeSend?: (event: infer T) => unknown } ? T : never) {
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });

  process.on('unhandledRejection', (reason) => {
    Sentry.captureException(reason);
  });

  app.addHook('onError', async (_request, _reply, error) => {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    if (statusCode >= 500) {
      Sentry.captureException(error);
    }
  });

  app.log.info('Sentry initialized for backend error tracking.');
};

export default sentryPlugin;
