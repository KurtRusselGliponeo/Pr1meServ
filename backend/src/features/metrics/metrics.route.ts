import type { FastifyPluginAsync } from 'fastify';

import { GetPerformanceMetricsQuerySchema, PerformanceLeaderboardQuerySchema } from '@a1prime/schemas';
import { requireRole } from '@/app/middleware/require-role';
import { metricsService } from '@/features/metrics/metrics.service';

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
      const result = await metricsService.getPerformanceMetrics(query);
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
      const result = await metricsService.getLeaderboard(query);
      return reply.code(200).send(result);
    },
  );
};

export default metricsRoutes;

