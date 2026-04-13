import 'dotenv/config';
import './shared/types/fastify-auth';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import identityRoutes from './modules/identity/identity.routes';
import { getJwtSecret } from './shared/lib/auth';

const buildApp = async () => {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: [process.env.FRONTEND_URL || 'http://localhost:3000'],
    credentials: true,
  });

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

  await app.register(identityRoutes);

  app.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
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
