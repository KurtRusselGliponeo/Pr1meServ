import type { FastifyPluginAsync } from 'fastify';

import { GetPerformanceMetricsQuerySchema, PerformanceLeaderboardQuerySchema } from '@a1prime/schemas';
import { requireRole } from '@/app/middleware/require-role';
import { metricsService } from '@/features/phase-5-performance/metrics/metrics.service';

/**
 * Registers dashboard metrics routes.
 *
 * @param app Fastify application instance.
 * @returns Route registration completion.
 */
const metricsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/metrics',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])],
    },
    async (request, reply) => {
      const query = GetPerformanceMetricsQuerySchema.parse(request.query);
      const result = await metricsService.getPerformanceMetrics(query, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.get(
    '/metrics/leaderboard',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])],
    },
    async (request, reply) => {
      const query = PerformanceLeaderboardQuerySchema.parse(request.query);
      const result = await metricsService.getLeaderboard(query, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.get(
    '/metrics/report',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])],
    },
    async (request, reply) => {
      const query = PerformanceLeaderboardQuerySchema.parse(request.query);
      const csv = await metricsService.buildCsvReport(query, request.authUser);
      const fileName = `performance-report-${query.year}-${String(query.month).padStart(2, '0')}.csv`;

      reply.header('content-type', 'text/csv; charset=utf-8');
      reply.header('content-disposition', `attachment; filename="${fileName}"`);
      return reply.code(200).send(csv);
    },
  );

  /**
   * Manual NAP/APE entry endpoint — Admin only.
   * Upserts a performance metric row for a given agent + month.
   * If a row already exists for that agent+month it accumulates (adds) the submitted values.
   */
  app.post(
    '/metrics/manual-entry',
    {
      preHandler: [app.authenticate, requireRole(['Admin'])],
    },
    async (request, reply) => {
      const result = await metricsService.manualEntry(request.body, request.authUser);
      return reply.code(201).send(result);
    },
  );

  /** List all manual entry records so admin can review them. */
  app.get(
    '/metrics/manual-entries',
    {
      preHandler: [app.authenticate, requireRole(['Admin'])],
    },
    async (request, reply) => {
      const result = await metricsService.listManualEntries(request.authUser);
      return reply.code(200).send(result);
    },
  );

  /** Delete a single manual entry record. */
  app.delete(
    '/metrics/manual-entries/:entryId',
    {
      preHandler: [app.authenticate, requireRole(['Admin'])],
    },
    async (request, reply) => {
      const { entryId } = request.params as { entryId: string };
      await metricsService.deleteManualEntry(entryId, request.authUser);
      return reply.code(204).send();
    },
  );
};

export default metricsRoutes;
