import type { FastifyPluginAsync } from 'fastify';
import { listManualPoliciesQuerySchema } from '@a1prime/schemas';

import { requireRole } from '@/app/middleware/require-role';
import { policiesService } from './policies.service';

const policiesRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/policies',
    { preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])] },
    async (request, reply) => {
      const query = listManualPoliciesQuerySchema.parse(request.query);
      const result = await policiesService.listPolicies(query, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.get(
    '/policies/:policyId',
    { preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])] },
    async (request, reply) => {
      const params = request.params as { policyId: string };
      const result = await policiesService.getPolicyDetail(params.policyId, request.authUser);
      return reply.code(200).send(result);
    },
  );
};

export default policiesRoutes;
