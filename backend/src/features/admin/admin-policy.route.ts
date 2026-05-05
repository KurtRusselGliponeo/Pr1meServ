import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireRole } from '@/app/middleware/require-role';
import { adminPolicyService } from '@/features/admin/admin-policy.service';

const CreatePolicyBodySchema = z.object({
  agentId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  policyNumber: z.string().min(1).max(50),
  productType: z.string().max(120).optional(),
  planCode: z.string().max(50).optional(),
  modalPremium: z.number().min(0),
  api: z.number().min(0),
  sumAssured: z.number().min(0),
  commissionAmount: z.number().min(0),
  caseStatus: z.string().min(1),
  policyStatus: z.string().min(1),
  dateIssued: z.string().optional(),
  dateClosed: z.string().optional(),
  notes: z.string().max(2000).optional(),
  branchCode: z.string().max(50).optional(),
});

const UpdatePolicyBodySchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  productType: z.string().max(120).nullable().optional(),
  planCode: z.string().max(50).nullable().optional(),
  modalPremium: z.number().min(0).optional(),
  api: z.number().min(0).optional(),
  sumAssured: z.number().min(0).optional(),
  commissionAmount: z.number().min(0).optional(),
  caseStatus: z.string().optional(),
  policyStatus: z.string().optional(),
  dateIssued: z.string().nullable().optional(),
  dateClosed: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  branchCode: z.string().max(50).optional(),
});

const adminPolicyRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/admin/policies',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const query = z.object({
        agentId: z.string().uuid().optional(),
        search: z.string().optional(),
      }).parse(request.query);

      const result = await adminPolicyService.listPolicies(query.agentId, query.search, request.authUser);
      return reply.code(200).send({ data: result });
    },
  );

  app.post(
    '/admin/policies',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const body = CreatePolicyBodySchema.parse(request.body);
      const result = await adminPolicyService.createPolicy(body, request.authUser);
      return reply.code(201).send(result);
    },
  );

  app.patch(
    '/admin/policies/:policyId',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const { policyId } = z.object({ policyId: z.string().uuid() }).parse(request.params);
      const body = UpdatePolicyBodySchema.parse(request.body);
      await adminPolicyService.updatePolicy(policyId, body, request.authUser);
      return reply.code(200).send({ ok: true });
    },
  );

  app.delete(
    '/admin/policies/:policyId',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const { policyId } = z.object({ policyId: z.string().uuid() }).parse(request.params);
      await adminPolicyService.deletePolicy(policyId, request.authUser);
      return reply.code(204).send();
    },
  );
};

export default adminPolicyRoutes;
