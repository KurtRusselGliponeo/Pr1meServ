import 'dotenv/config';
import './shared/types/fastify-auth';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import authRoutes from './routes/auth.routes';
import clientProfilesRoutes from './routes/client-profiles.routes';
import { assertRedisConnection, isRedisEnabled, redis } from './lib/redis';
import { logger } from './lib/logger';
import { BusinessRuleError, ForbiddenError, NotFoundError, UnauthorizedError } from './lib/errors';
import { getJwtSecret } from './shared/lib/auth';
import { assertDatabaseConnection } from './shared/db/client';

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

  await app.register(cors, {
    origin: [process.env.FRONTEND_URL || 'http://localhost:3000'],
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
    } else if (error instanceof BusinessRuleError) {
      statusCode = 422;
      errorType = error.name;
      message = error.message;
    } else if (error instanceof ZodError || isZodLikeError(error)) {
      statusCode = 400;
      errorType = 'ValidationError';
      message = 'Request validation failed.';
      details = error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`);
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
      error.statusCode === 429
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
  await app.register(clientProfilesRoutes, { prefix: '/api/v1' });

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
