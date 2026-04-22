import type { FastifyPluginAsync } from 'fastify';
import { ListProspectsQuerySchema, UpdateProspectStageSchema } from '@a1prime/schemas';
import { requireRole } from '@/app/middleware/require-role';
import { prospectsService } from './prospects.service';

const prospectsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/prospects',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])],
    },
    async (request, reply) => {
      const query = ListProspectsQuerySchema.parse(request.query);
      const result = await prospectsService.listProspects(request.authUser, query);
      return reply.code(200).send(result);
    },
  );

  app.patch(
    '/prospects/:prospectId/stage',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])],
    },
    async (request, reply) => {
      const params = request.params as { prospectId: string };
      const body = UpdateProspectStageSchema.parse(request.body);
      const result = await prospectsService.updateProspectStage(
        params.prospectId,
        body.pipelineStage,
        request.authUser,
      );
      return reply.code(200).send(result);
    },
  );
};

export default prospectsRoutes;
