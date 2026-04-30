import fastifyJwt from '@fastify/jwt';
import type { FastifyPluginAsync } from 'fastify';
import { UnauthorizedError } from '../../lib/errors';
import { getJwtSecret } from '../../shared/lib/auth';

const authPlugin: FastifyPluginAsync = async (app) => {
  await app.register(fastifyJwt, {
    secret: getJwtSecret(),
  });

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
};

export default authPlugin;
