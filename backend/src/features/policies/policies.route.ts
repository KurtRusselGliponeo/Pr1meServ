import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { requireRole } from '@/app/middleware/require-role';
import { policiesService } from './policies.service';

const ListPoliciesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(15),
  search: z.string().optional(),
  agentId: z.string().uuid().optional(),
  branchCode: z.string().optional(),
});

const policiesRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/policies',
    { preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])] },
    async (request, reply) => {
      const query = ListPoliciesQuerySchema.parse(request.query);
      const result = await policiesService.listPolicies(query, request.authUser);

      return reply.code(200).send(result);
    },
  );
};

export default policiesRoutes;
