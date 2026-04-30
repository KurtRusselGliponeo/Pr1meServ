import type { FastifyPluginAsync } from 'fastify';

import { z } from 'zod';
import { requireRole } from '@/app/middleware/require-role';
import { notificationsService } from '@/features/notifications/notifications.service';

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

  app.get(
    '/admin/logs',
    {
      preHandler: [app.authenticate, requireRole(['Admin'])],
    },
    async (_request, reply) => {
      const result = await notificationsService.getAdminSystemLogs();
      return reply.code(200).send(result);
    },
  );

  app.get(
    '/admin/search',
    {
      preHandler: [app.authenticate, requireRole(['Admin'])],
    },
    async (request, reply) => {
      const query = z.object({ q: z.string().trim().min(1).max(100) }).parse(request.query);
      const result = await notificationsService.searchAgentsAndClients(query.q);
      return reply.code(200).send(result);
    },
  );

  app.get(
    '/admin/overview',
    {
      preHandler: [app.authenticate, requireRole(['Admin'])],
    },
    async (_request, reply) => {
      const result = await notificationsService.getAdminOverview();
      return reply.code(200).send(result);
    },
  );
};

export default notificationsRoutes;

