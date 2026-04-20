import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { requireRole } from '@/app/middleware/require-role';
import { lapsationService } from '@/features/phase-5-performance/lapsation/lapsation.service';

const lapsationRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/lapsation',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])],
    },
    async (_request, reply) => {
      const result = await lapsationService.getDashboard();
      return reply.code(200).send(result);
    },
  );

  app.post(
    '/lapsation/:id/reinstate',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])],
    },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const result = await lapsationService.reinstateRecord(id, request.authUser.sub);
      return reply.code(200).send(result);
    },
  );
};

export default lapsationRoutes;

