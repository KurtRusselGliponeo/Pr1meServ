import type { FastifyPluginAsync } from 'fastify';
import { manualPolicyInputSchema, updateManualPolicySchema, listManualPoliciesQuerySchema } from '@a1prime/schemas';

import { requireRole } from '@/app/middleware/require-role';
import { adminPolicyService } from '@/features/admin/admin-policy.service';

const adminPolicyRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/admin/policies',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const query = listManualPoliciesQuerySchema.parse(request.query);
      const result = await adminPolicyService.listPolicies(query, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.get(
    '/admin/policies/:policyId',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const params = request.params as { policyId: string };
      const result = await adminPolicyService.getPolicyDetail(params.policyId, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.post(
    '/admin/policies',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const body = manualPolicyInputSchema.parse(request.body);
      const result = await adminPolicyService.createPolicy(body, request.authUser);
      return reply.code(201).send(result);
    },
  );

  app.patch(
    '/admin/policies/:policyId',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const params = request.params as { policyId: string };
      const body = updateManualPolicySchema.parse(request.body);
      const result = await adminPolicyService.updatePolicy(params.policyId, body, request.authUser);
      return reply.code(200).send(result);
    },
  );
};

export default adminPolicyRoutes;
