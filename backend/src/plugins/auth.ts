import fastifyJwt from '@fastify/jwt';
import type { FastifyPluginAsync } from 'fastify';
import { getJwtSecret } from '../shared/lib/auth';

const authPlugin: FastifyPluginAsync = async (app) => {
  await app.register(fastifyJwt, {
    secret: getJwtSecret(),
  });

  app.decorate('authenticate', async function authenticate(request, reply) {
    try {
      await request.jwtVerify();

      if (request.user.tokenType !== 'access') {
        reply.code(401).send({ message: 'Invalid access token.' });
        return;
      }

      request.authUser = request.user;
    } catch {
      reply.code(401).send({ message: 'Unauthorized' });
    }
  });
};

export default authPlugin;
