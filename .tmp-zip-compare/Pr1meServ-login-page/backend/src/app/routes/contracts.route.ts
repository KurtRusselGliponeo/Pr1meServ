import type { FastifyPluginAsync } from 'fastify';

import { eventCatalog } from '@/contracts/event-catalog';
import { buildOpenApiDocument } from '@/contracts/openapi';

const contractsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/contracts/openapi.json', async (_request, reply) => {
    return reply.code(200).send(buildOpenApiDocument(eventCatalog));
  });

  app.get('/contracts/events', async (_request, reply) => {
    return reply.code(200).send(eventCatalog);
  });
};

export default contractsRoutes;
