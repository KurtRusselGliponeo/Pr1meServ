import type { FastifyPluginAsync } from 'fastify';

import { UpdateAgentProfileSchema } from '@a1prime/schemas';
import { requireRole } from '@/app/middleware/require-role';
import { agentsService } from '@/features/agents/agents.service';

/**
 * Registers agent profile routes.
 *
 * @param app Fastify application instance.
 * @returns Route registration completion.
 */
const agentsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/agents/:agentId',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])],
    },
    async (request, reply) => {
      const params = request.params as { agentId: string };
      const result = await agentsService.getAgentProfile(params.agentId);
      return reply.code(200).send(result);
    },
  );

  app.patch(
    '/agents/:agentId',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])],
    },
    async (request, reply) => {
      const params = request.params as { agentId: string };
      const body = UpdateAgentProfileSchema.parse(request.body);
      const result = await agentsService.updateAgentProfile(
        params.agentId,
        body,
        request.authUser.id,
      );
      return reply.code(200).send(result);
    },
  );
};

export default agentsRoutes;

