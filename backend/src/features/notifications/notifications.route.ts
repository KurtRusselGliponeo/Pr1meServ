import type { FastifyPluginAsync } from 'fastify';

import { z } from 'zod';
import { requireRole } from '@/app/middleware/require-role';
import { notificationsService } from '@/features/notifications/notifications.service';
import { db } from '@/db/client';
import { notifications } from '@/schema';

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

  app.post(
    '/notifications/send',
    {
      preHandler: [app.authenticate, requireRole(['BranchManager', 'Admin'])],
    },
    async (request, reply) => {
      const input = z.object({
        userId: z.string().uuid(),
        message: z.string().min(1),
      }).parse(request.body);



      await db.insert(notifications).values({
        userId: input.userId,
        channel: 'in_app',
        subject: 'Direct Message',
        message: input.message,
        status: 'sent',
      });

      return reply.code(201).send({ success: true });
    }
  );
};

export default notificationsRoutes;

