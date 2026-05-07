import type { FastifyPluginAsync } from 'fastify';

import { requireRole } from '@/app/middleware/require-role';
import { adminDataCenterService } from '@/features/admin/data-center.service';

const adminDataCenterRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/admin/data-center/summary',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const result = await adminDataCenterService.getSummary(request.authUser);
      return reply.code(200).send(result);
    },
  );
};

export default adminDataCenterRoutes;
