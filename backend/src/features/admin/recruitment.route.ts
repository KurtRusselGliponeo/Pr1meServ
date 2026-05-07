import type { FastifyPluginAsync } from 'fastify';
import {
  listManualRecruitmentsQuerySchema,
  manualRecruitmentInputSchema,
  recruitmentStatusActionSchema,
  updateManualRecruitmentSchema,
} from '@a1prime/schemas';
import { z } from 'zod';

import { requireRole } from '@/app/middleware/require-role';
import { adminRecruitmentService } from '@/features/admin/recruitment.service';

const adminRecruitmentRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/admin/recruitments',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const query = listManualRecruitmentsQuerySchema.parse(request.query);
      const result = await adminRecruitmentService.listRecruitments(query, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.get(
    '/admin/recruitments/:recruitmentId',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const { recruitmentId } = z.object({ recruitmentId: z.string().uuid() }).parse(request.params);
      const result = await adminRecruitmentService.getRecruitmentDetail(recruitmentId, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.post(
    '/admin/recruitments',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const body = manualRecruitmentInputSchema.parse(request.body);
      const result = await adminRecruitmentService.createRecruitment(body, request.authUser);
      return reply.code(201).send(result);
    },
  );

  app.patch(
    '/admin/recruitments/:recruitmentId',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const { recruitmentId } = z.object({ recruitmentId: z.string().uuid() }).parse(request.params);
      const body = updateManualRecruitmentSchema.parse(request.body);
      const result = await adminRecruitmentService.updateRecruitment(recruitmentId, body, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.post(
    '/admin/recruitments/:recruitmentId/terminate',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const { recruitmentId } = z.object({ recruitmentId: z.string().uuid() }).parse(request.params);
      const body = recruitmentStatusActionSchema.parse(request.body ?? {});
      const result = await adminRecruitmentService.terminateRecruitment(recruitmentId, body, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.post(
    '/admin/recruitments/:recruitmentId/reinstate',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const { recruitmentId } = z.object({ recruitmentId: z.string().uuid() }).parse(request.params);
      const body = recruitmentStatusActionSchema.parse(request.body ?? {});
      const result = await adminRecruitmentService.reinstateRecruitment(recruitmentId, body, request.authUser);
      return reply.code(200).send(result);
    },
  );
};

export default adminRecruitmentRoutes;
