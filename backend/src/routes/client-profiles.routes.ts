import type { FastifyPluginAsync } from 'fastify';

import { ListClientProfilesQuerySchema } from '@a1prime/schemas';
import { requireRole } from '@/middleware/require-role';
import { clientProfilesService } from '@/services/client-profiles.service';

/**
 * Registers the Phase 3 COSAF client profile listing route.
 *
 * @param app Fastify application instance.
 * @returns Route registration completion.
 * @throws Rethrows validation and service errors to the global handler.
 */
const clientProfilesRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/client-profiles',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])],
    },
    async (request, reply) => {
      const query = ListClientProfilesQuerySchema.parse(request.query);
      const result = await clientProfilesService.listClientProfiles(query, request.authUser);

      return reply.code(200).send(result);
    },
  );
};

export default clientProfilesRoutes;
