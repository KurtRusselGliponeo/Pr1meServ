import type { FastifyPluginAsync } from 'fastify';

import {
  ClientProfileImportRequestSchema,
  ClientProfileReassignSchema,
  ListClientProfilesQuerySchema,
} from '@a1prime/schemas';
import { BusinessRuleError } from '@/lib/errors';
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

  app.post(
    '/client-profiles/import',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])],
    },
    async (request, reply) => {
      const upload = await request.file();

      if (!upload) {
        throw new BusinessRuleError('A client profile import file is required.');
      }

      ClientProfileImportRequestSchema.parse({
        fileName: upload.filename,
      });

      const result = await clientProfilesService.importClientProfile(upload);

      return reply.code(201).send(result);
    },
  );

  app.post(
    '/client-profiles/reassign',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])],
    },
    async (request, reply) => {
      const body = ClientProfileReassignSchema.parse(request.body);
      const result = await clientProfilesService.reassignClientProfiles(body, request.authUser);

      return reply.code(200).send(result);
    },
  );
};

export default clientProfilesRoutes;
