import type { FastifyPluginAsync } from 'fastify';
import {
  listManualPersistencyQuerySchema,
  manualPersistencyInputSchema,
  updateManualPersistencySchema,
} from '@a1prime/schemas';
import { z } from 'zod';

import { requireRole } from '@/app/middleware/require-role';
import { persistencyService } from '@/features/admin/persistency.service';

const paramsSchema = z.object({ id: z.string().uuid() });

const persistencyRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/persistency',
    { preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])] },
    async (request, reply) => {
      const query = listManualPersistencyQuerySchema.parse(request.query);
      const result = await persistencyService.listPersistencyRecords(query, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.get(
    '/persistency/:id',
    { preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])] },
    async (request, reply) => {
      const { id } = paramsSchema.parse(request.params);
      const result = await persistencyService.getPersistencyRecord(id, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.post(
    '/persistency',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const body = manualPersistencyInputSchema.parse(request.body);
      const result = await persistencyService.createPersistencyRecord(body, request.authUser);
      return reply.code(201).send(result);
    },
  );

  app.patch(
    '/persistency/:id',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const { id } = paramsSchema.parse(request.params);
      const body = updateManualPersistencySchema.parse(request.body);
      const result = await persistencyService.updatePersistencyRecord(id, body, request.authUser);
      return reply.code(200).send(result);
    },
  );
};

export default persistencyRoutes;
