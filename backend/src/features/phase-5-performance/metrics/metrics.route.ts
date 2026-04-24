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
};

export default metricsRoutes;

