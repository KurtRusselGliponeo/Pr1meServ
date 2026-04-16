import type { FastifyPluginAsync } from 'fastify';

import { GetPerformanceMetricsQuerySchema } from '@a1prime/schemas';
import { requireRole } from '@/middleware/require-role';
import { metricsService } from '@/services/metrics.service';

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
};

export default metricsRoutes;
