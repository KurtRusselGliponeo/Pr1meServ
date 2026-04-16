import type { FastifyPluginAsync } from 'fastify';

import { LoginRequestSchema } from '@a1prime/schemas';
import { UnauthorizedError } from '@/lib/errors';
import { requireRole } from '@/middleware/require-role';
import { authService } from '@/services/auth.service';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function serializeRefreshTokenCookie(value: string, maxAge: number): string {
  return [
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
  ].join('; ');
}

function getRefreshTokenCookie(rawCookieHeader?: string): string | null {
  if (!rawCookieHeader) {
    return null;
  }

  const refreshCookie = rawCookieHeader
    .split(';')
    .map((cookiePart) => cookiePart.trim())
    .find((cookiePart) => cookiePart.startsWith(`${REFRESH_COOKIE_NAME}=`));

  if (!refreshCookie) {
    return null;
  }

  return decodeURIComponent(refreshCookie.slice(REFRESH_COOKIE_NAME.length + 1));
}

/**
 * Registers thin auth route handlers for login, refresh, logout, and admin-only checks.
 *
 * @param app Fastify application instance.
 * @returns Route registration completion.
 * @throws Rethrows validation and service errors to the global error handler.
 */
const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: 50, // Increased for dev testing
          timeWindow: '15 minutes',
        },
      },
    },
    async (request, reply) => {
      const body = LoginRequestSchema.parse(request.body);
      const result = await authService.login(body.email, body.password);

      reply.header(
        'set-cookie',
        serializeRefreshTokenCookie(result.refreshToken, REFRESH_COOKIE_MAX_AGE_SECONDS),
      );

      return reply.code(200).send({
        accessToken: result.accessToken,
        user: result.user,
      });
    },
  );

  app.post('/auth/refresh', async (request, reply) => {
    const refreshToken = getRefreshTokenCookie(request.headers.cookie);

    if (!refreshToken) {
      throw new UnauthorizedError('Unauthorized');
    }

    const result = await authService.refreshToken(refreshToken);

    reply.header(
      'set-cookie',
      serializeRefreshTokenCookie(result.refreshToken, REFRESH_COOKIE_MAX_AGE_SECONDS),
    );

    return reply.code(200).send({
      accessToken: result.accessToken,
    });
  });

  app.post('/auth/logout', async (_request, reply) => {
    reply.header('set-cookie', serializeRefreshTokenCookie('', 0));
    return reply.code(204).send();
  });

  app.get(
    '/auth/admin-only',
    {
      preHandler: [app.authenticate, requireRole(['Admin'])],
    },
    async () => {
      return { ok: true };
    },
  );

  app.get('/auth/me', { preHandler: app.authenticate }, async (request) => {
    return {
      user: await authService.getCurrentUser(request.authUser.id),
    };
  });

  app.get('/private/health', { preHandler: app.authenticate }, async (request) => {
    return {
      status: 'authenticated',
      userId: request.authUser.id,
      role: request.authUser.role,
      timestamp: new Date().toISOString(),
    };
  });
};

export default authRoutes;
