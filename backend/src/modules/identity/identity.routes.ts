import type { FastifyPluginAsync } from 'fastify';
import { IdentityService } from './identity.service';

const identityRoutes: FastifyPluginAsync = async (app) => {
  const identityService = new IdentityService();

  app.post('/auth/register', async (request, reply) => {
    const body = request.body as {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
    };

    const result = await identityService.registerUser(app, {
      email: body.email ?? '',
      password: body.password ?? '',
      firstName: body.firstName ?? '',
      lastName: body.lastName ?? '',
      role: body.role ?? 'Agent',
    });

    return reply.code(201).send(result);
  });

  app.post('/auth/login', async (request) => {
    const body = request.body as {
      email?: string;
      password?: string;
    };

    return identityService.login(app, {
      email: body.email ?? '',
      password: body.password ?? '',
    });
  });

  app.post('/auth/refresh', async (request) => {
    const body = request.body as {
      refreshToken?: string;
    };

    return identityService.refreshTokens(app, body.refreshToken ?? '');
  });

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
