import type { FastifyPluginAsync } from 'fastify';

import { CreateUserSchema, ListUsersQuerySchema } from '@a1prime/schemas';
import { requireRole } from '@/middleware/require-role';
import { usersService } from '@/services/users.service';

/**
 * Registers admin-only user management routes.
 *
 * @param app Fastify application instance.
 * @returns Route registration completion.
 */
const usersRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/users',
    {
      preHandler: [app.authenticate, requireRole(['Admin'])],
    },
    async (request, reply) => {
      const query = ListUsersQuerySchema.parse(request.query);
      const result = await usersService.listUsers(query);
      return reply.code(200).send(result);
    },
  );

  app.post(
    '/users',
    {
      preHandler: [app.authenticate, requireRole(['Admin'])],
    },
    async (request, reply) => {
      const body = CreateUserSchema.parse(request.body);
      const result = await usersService.createUser(body, request.authUser.id);
      return reply.code(201).send(result);
    },
  );

  app.delete(
    '/users/:userId',
    {
      preHandler: [app.authenticate, requireRole(['Admin'])],
    },
    async (request, reply) => {
      const params = request.params as { userId: string };
      await usersService.softDeleteUser(params.userId, request.authUser.id);
      return reply.code(204).send();
    },
  );
};

export default usersRoutes;
