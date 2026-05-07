import 'dotenv/config';
import './shared/types/fastify-auth';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { z } from 'zod';
import sentryPlugin from './app/plugins/sentry';
import contractsRoutes from './app/routes/contracts.route';
import authRoutes from './features/identity/identity.route';
import agentsRoutes from './features/phase-4-agent-workbench/agents/agents.route';
import prospectsRoutes from './features/phase-4-agent-workbench/prospects/prospects.route';
import clientProfilesRoutes from './features/phase-3-reassignment/client-profiles/client-profiles.route';
import cosafApprovalsRoutes from './features/phase-2-bm-workflow/cosaf/cosaf-approvals.route';
import documentsRoutes from './features/phase-2-bm-workflow/documents/documents.route';
import lapsationRoutes from './features/phase-5-performance/lapsation/lapsation.route';
import metricsRoutes from './features/phase-5-performance/metrics/metrics.route';
import notificationsRoutes from './features/notifications/notifications.route';
import usersRoutes from './features/users/users.route';
import adminPolicyRoutes from './features/admin/admin-policy.route';
import adminNapTransactionsRoutes from './features/admin/nap-transactions.route';
import adminRecruitmentRoutes from './features/admin/recruitment.route';
import planCodesRoutes from './features/admin/plan-codes.route';
import policiesRoutes from './features/policies/policies.route';
import { assertRedisConnection, isRedisEnabled, redis } from './lib/redis';
import { logger } from './lib/logger';
import {
  BadRequestError,
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from './lib/errors';
import { getJwtSecret } from './shared/lib/auth';
import { assertDatabaseConnection, assertRequiredDatabaseSchema } from './db/client';
import { validateRequiredConstraints } from './db/migrations/validation';
import { getQueueHealthSummary } from './shared/lib/queue';
import { initI18n } from './lib/i18n';

function isZodLikeError(
  error: unknown,
): error is { issues: Array<{ path: Array<string | number>; message: string }> } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'ZodError' &&
    'issues' in error &&
    Array.isArray(error.issues)
  );
}

const buildApp = async () => {
  const app = Fastify({
    loggerInstance: logger,
  });

  await initI18n();

  await app.register(sentryPlugin);

  await app.register(cors, {
    origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://127.0.0.1:3005', 'http://localhost:3005'],
    credentials: true,
  });

  await app.register(fastifyJwt, {
    secret: getJwtSecret(),
  });
  await app.register(multipart);

  app.decorate('authenticate', async function authenticate(request, _reply) {
    try {
      await request.jwtVerify();

      if (request.user.tokenType !== 'access') {
        throw new UnauthorizedError('Invalid access token.');
      }

      request.authUser = request.user;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      throw new UnauthorizedError('Unauthorized');
    }
  });
  await assertRedisConnection();
  await assertDatabaseConnection();
  await assertRequiredDatabaseSchema();

  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    redis: isRedisEnabled ? redis : undefined,
    keyGenerator: (request) => request.ip,
    skipOnError: !isRedisEnabled,
    errorResponseBuilder: (_request, _context) => ({
      statusCode: 429,
      error: 'RateLimitExceeded',
      message: 'Too many requests. Please try again later.',
      details: [],
    }),
  });

  app.setNotFoundHandler(
    {
      preHandler: app.rateLimit() as never,
    },
    async () => {
      throw new NotFoundError();
    },
  );

  app.setErrorHandler((error, request, reply) => {
    let statusCode = 500;
    let errorType = 'InternalServerError';
    let message = 'An unexpected error occurred.';
    let details: string[] = [];

    if (error instanceof NotFoundError) {
      statusCode = 404;
      errorType = error.name;
      message = error.message;
    } else if (error instanceof BadRequestError) {
      statusCode = 400;
      errorType = error.name;
      message = error.message;
    } else if (error instanceof BusinessRuleError) {
      statusCode = 422;
      errorType = error.name;
      message = error.message;
    } else if (error instanceof z.ZodError || isZodLikeError(error)) {
      statusCode = 400;
      errorType = 'ValidationError';
      message = 'Request validation failed.';
      const validationError = error as {
        issues: Array<{ path: Array<string | number>; message: string }>;
      };
      details = validationError.issues.map((issue) =>
        `${issue.path.join('.') || 'body'}: ${issue.message}`,
      );
    } else if (error instanceof UnauthorizedError) {
      statusCode = 401;
      errorType = error.name;
      message = error.message;
    } else if (error instanceof ForbiddenError) {
      statusCode = 403;
      errorType = error.name;
      message = error.message;
    } else if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      (error as { statusCode?: number }).statusCode === 429
    ) {
      statusCode = 429;
      errorType = 'RateLimitExceeded';
      message = 'Too many requests. Please try again later.';
    }

    if (statusCode === 500) {
      request.log.error({ err: error }, 'Unhandled request error.');
    } else if (
      statusCode === 404 ||
      statusCode === 422 ||
      statusCode === 400 ||
      statusCode === 403
    ) {
      request.log.warn({ err: error }, 'Handled request error.');
    } else {
      request.log.warn({ err: error }, 'Request rejected.');
    }

    reply.code(statusCode).send({
      error: errorType,
      message,
      details,
    });
  });

  await app.register(authRoutes, { prefix: '/api/v1' });
  await app.register(usersRoutes, { prefix: '/api/v1' });
  await app.register(adminPolicyRoutes, { prefix: '/api/v1' });
  await app.register(adminNapTransactionsRoutes, { prefix: '/api/v1' });
  await app.register(adminRecruitmentRoutes, { prefix: '/api/v1' });
  await app.register(planCodesRoutes, { prefix: '/api/v1' });
  await app.register(policiesRoutes, { prefix: '/api/v1' });
  await app.register(agentsRoutes, { prefix: '/api/v1' });
  await app.register(prospectsRoutes, { prefix: '/api/v1' });
  await app.register(clientProfilesRoutes, { prefix: '/api/v1' });
  await app.register(cosafApprovalsRoutes, { prefix: '/api/v1' });
  await app.register(documentsRoutes, { prefix: '/api/v1' });
  await app.register(lapsationRoutes, { prefix: '/api/v1' });
  await app.register(metricsRoutes, { prefix: '/api/v1' });
  await app.register(notificationsRoutes, { prefix: '/api/v1' });
  await app.register(contractsRoutes, { prefix: '/api/v1' });

  app.get('/health', async (_request, reply) => {
    try {
      await Promise.all([assertDatabaseConnection(), assertRedisConnection()]);

      return {
        db: 'ok',
        redis: isRedisEnabled ? 'ok' : 'disabled',
      };
    } catch (error) {
      app.log.error({ err: error }, 'Health check failed.');

      return reply.code(503).send({
        db: 'down',
        redis: isRedisEnabled ? (redis.status === 'ready' ? 'ok' : 'down') : 'disabled',
      });
    }
  });

  app.get('/api/v1/diagnostics/startup', async (_request, reply) => {
    try {
      await assertDatabaseConnection();
      const [queue, migrations] = await Promise.all([
        getQueueHealthSummary(),
        validateRequiredConstraints(),
      ]);

      const status =
        queue.status === 'ok' && migrations.status === 'ok' ? 'ok' : 'degraded';

      return reply.code(status === 'ok' ? 200 : 503).send({
        status,
        database: 'ok',
        queue,
        migrations,
      });
    } catch (error) {
      app.log.error({ err: error }, 'Startup diagnostics failed.');

      return reply.code(503).send({
        status: 'down',
        database: 'down',
        queue: {
          enabled: isRedisEnabled,
          status: isRedisEnabled ? 'degraded' : 'disabled',
          redis: isRedisEnabled ? 'down' : 'disabled',
          workerHeartbeat: {
            status: isRedisEnabled ? 'missing' : 'disabled',
            timestampUtc: null,
            ageMs: null,
          },
        },
        migrations: {
          status: 'degraded',
          checks: [],
        },
      });
    }
  });

  return app;
};

const start = async () => {
  try {
    const app = await buildApp();
    const port = parseInt(process.env.PORT || '8080', 10);
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

export default buildApp;
