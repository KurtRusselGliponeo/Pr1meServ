import type { FastifyPluginAsync } from 'fastify';

import { requireRole } from '@/middleware/require-role';
import { notificationsService } from '@/services/notifications.service';

const notificationsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/notifications/logs',
    {
      preHandler: [app.authenticate, requireRole(['Admin'])],
    },
    async (_request, reply) => {
      const result = await notificationsService.getNotificationLogs();
      return reply.code(200).send(result);
    },
  );
};

export default notificationsRoutes;
