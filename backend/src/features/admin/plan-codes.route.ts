import type { FastifyPluginAsync } from 'fastify';
import {
  createPlanCodeSchema,
  listPlanCodesQuerySchema,
  updatePlanCodeSchema,
} from '@a1prime/schemas';
import { z } from 'zod';

import { requireRole } from '@/app/middleware/require-role';
import { planCodesService } from '@/features/admin/plan-codes.service';

const paramsSchema = z.object({ id: z.string().uuid() });

const planCodesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/plan-codes', { preHandler: [app.authenticate] }, async (request, reply) => {
    const query = listPlanCodesQuerySchema.parse(request.query);
    const result = await planCodesService.listPlanCodes(query);
    return reply.code(200).send({ data: result });
  });

  app.get('/plan-codes/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);
    const result = await planCodesService.getPlanCode(id);
    return reply.code(200).send(result);
  });

  app.post(
    '/plan-codes',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const body = createPlanCodeSchema.parse(request.body);
      const result = await planCodesService.createPlanCode(body, request.authUser);
      return reply.code(201).send(result);
    },
  );

  app.patch(
    '/plan-codes/:id',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const { id } = paramsSchema.parse(request.params);
      const body = updatePlanCodeSchema.parse(request.body);
      const result = await planCodesService.updatePlanCode(id, body, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.post(
    '/plan-codes/:id/deactivate',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const { id } = paramsSchema.parse(request.params);
      const result = await planCodesService.deactivatePlanCode(id, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.post(
    '/plan-codes/:id/reactivate',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const { id } = paramsSchema.parse(request.params);
      const result = await planCodesService.reactivatePlanCode(id, request.authUser);
      return reply.code(200).send(result);
    },
  );
};

export default planCodesRoutes;
