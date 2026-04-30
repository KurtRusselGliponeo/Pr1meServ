import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { cosafApprovalsService } from '@/features/phase-2-bm-workflow/cosaf/cosaf-approvals.service';
import { requireRole } from '@/app/middleware/require-role';

/**
 * Registers BM Workflow routers catching Approved and Rejected hooks
 */
export const cosafApprovalsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/cosaf-approvals', {
    preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])]
  }, async (request, reply) => {
    const result = await cosafApprovalsService.listPendingApprovals(
      request.authUser.sub,
      request.authUser.role,
    );
    return reply.code(200).send(result);
  });

  app.post('/cosaf-approvals/:id/approve', {
    preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])]
  }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const result = await cosafApprovalsService.approveReassignment(
      id,
      request.authUser.sub,
      request.authUser.role,
    );
    return reply.code(200).send(result);
  });

  app.post('/cosaf-approvals/:id/signed-copy', {
    preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])]
  }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const upload = await request.file();
    if (!upload) {
      return reply.code(400).send({ message: 'Signed copy file is required' });
    }

    const result = await cosafApprovalsService.uploadSignedCopy(
      id,
      upload,
      request.authUser.sub,
      request.authUser.role,
    );
    return reply.code(200).send(result);
  });
  
  app.post('/cosaf-approvals/:id/reject', {
    preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])]
  }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    // Strict schema blocking empty strings, enforcing minimal length logic per Business Requirements!
    const { reason } = z.object({ reason: z.string().min(10, 'A detailed rejection reason is required') }).parse(request.body);
    const result = await cosafApprovalsService.rejectReassignment(
      id,
      reason,
      request.authUser.sub,
      request.authUser.role,
    );
    return reply.code(200).send(result);
  });
};

export default cosafApprovalsRoutes;

