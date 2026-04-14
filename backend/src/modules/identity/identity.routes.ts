import type { FastifyPluginAsync } from 'fastify';
import type { SystemRole } from '@a1prime/schemas';
import { z } from 'zod';
import { requireRole } from '../../middleware/require-role';
import { IdentityService } from './identity.service';

const identityRoutes: FastifyPluginAsync = async (app) => {
  const identityService = new IdentityService();
  const registerSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(8).max(128),
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    role: z
      .enum(['Admin', 'BranchManager', 'Agent'] satisfies [SystemRole, ...SystemRole[]])
      .default('Agent'),
  });
  const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
  });
  const refreshSchema = z.object({
    refreshToken: z.string().min(1),
  });
  const resetPasswordSchema = z.object({
    email: z.string().trim().email(),
  });

  app.post('/auth/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const result = await identityService.registerUser(app, {
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
      role: body.role,
    });

    return reply.code(201).send(result);
  });

  app.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
        },
      },
    },
    async (request) => {
      const body = loginSchema.parse(request.body);

      return identityService.login(app, {
        email: body.email,
        password: body.password,
      });
    },
  );

  app.post('/auth/refresh', async (request) => {
    const body = refreshSchema.parse(request.body);

    return identityService.refreshTokens(app, body.refreshToken);
  });

  app.post(
    '/auth/reset-password',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '1 hour',
        },
      },
    },
    async (request) => {
      const body = resetPasswordSchema.parse(request.body);

      return identityService.requestPasswordReset(body.email);
    },
  );

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
    return identityService.getCurrentUser(request.authUser.sub);
  });

  app.get('/private/health', { preHandler: app.authenticate }, async (request) => {
    return {
      status: 'authenticated',
      userId: request.authUser.sub,
      role: request.authUser.role,
      timestamp: new Date().toISOString(),
    };
  });
};

export default identityRoutes;
