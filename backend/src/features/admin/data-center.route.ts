import type { FastifyPluginAsync } from 'fastify';
import {
  exportReportQuerySchema,
  listAuditFeedQuerySchema,
  listDataValidationIssuesQuerySchema,
  updateDataValidationIssueSchema,
} from '@a1prime/schemas';
import { z } from 'zod';

import { requireRole } from '@/app/middleware/require-role';
import { adminDataCenterService } from '@/features/admin/data-center.service';

const idParamsSchema = z.object({ id: z.string().uuid() });
const entityAuditParamsSchema = z.object({
  entityName: z.string().trim().min(1).max(100),
  entityId: z.string().uuid(),
});

const adminDataCenterRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/admin/data-center/summary',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const result = await adminDataCenterService.getSummary(request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.get(
    '/admin/data-center/validation-issues',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const query = listDataValidationIssuesQuerySchema.parse(request.query);
      const result = await adminDataCenterService.listValidationIssues(query, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.patch(
    '/admin/data-center/validation-issues/:id',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params);
      const body = updateDataValidationIssueSchema.parse(request.body);
      const result = await adminDataCenterService.updateValidationIssue(id, body, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.get(
    '/admin/data-center/audit-feed',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const query = listAuditFeedQuerySchema.parse(request.query);
      const result = await adminDataCenterService.listAuditFeed(query, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.get(
    '/admin/data-center/audit-feed/:entityName/:entityId',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const params = entityAuditParamsSchema.parse(request.params);
      const result = await adminDataCenterService.listEntityAuditTimeline(
        params.entityName,
        params.entityId,
        request.authUser,
      );
      return reply.code(200).send(result);
    },
  );

  app.get(
    '/admin/data-center/reports/export',
    { preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])] },
    async (request, reply) => {
      const query = exportReportQuerySchema.parse(request.query);
      const csv = await adminDataCenterService.exportCsvReport(query, request.authUser);
      return reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', `attachment; filename="${query.reportType}.csv"`)
        .code(200)
        .send(csv);
    },
  );
};

export default adminDataCenterRoutes;
