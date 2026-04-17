import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { cosafApprovalsService } from '@/services/cosaf-approvals.service';
import { requireRole } from '@/middleware/require-role';

/**
 * Registers BM Workflow routers catching Approved and Rejected hooks
 */
export const cosafApprovalsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/cosaf-approvals', {
    preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])]
  }, async (_request, reply) => {
    const result = await cosafApprovalsService.listPendingApprovals();
    return reply.code(200).send(result);
  });

  app.post('/cosaf-approvals/:id/approve', {
    preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])]
  }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const result = await cosafApprovalsService.approveReassignment(id, request.authUser.sub);
    return reply.code(200).send(result);
  });
  
  app.post('/cosaf-approvals/:id/reject', {
    preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])]
  }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    // Strict schema blocking empty strings, enforcing minimal length logic per Business Requirements!
    const { reason } = z.object({ reason: z.string().min(10, 'A detailed rejection reason is required') }).parse(request.body);
    const result = await cosafApprovalsService.rejectReassignment(id, reason, request.authUser.sub);
    return reply.code(200).send(result);
  });
};

export default cosafApprovalsRoutes;
