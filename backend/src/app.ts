import Fastify from 'fastify';

const buildApp = async () => {
  const app = Fastify({
    logger: true,
  });

  // Example: Register routes from modules
  // await app.register(import('./modules/identity/identity.routes'));
  // await app.register(import('./modules/cosaf/cosaf.routes'));

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
