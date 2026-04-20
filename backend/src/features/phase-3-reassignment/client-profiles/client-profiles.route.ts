import type { FastifyPluginAsync } from 'fastify';

import {
  ClientProfileImportRequestSchema,
  ClientProfileReassignSchema,
  ListClientProfilesQuerySchema,
} from '@a1prime/schemas';
import { BusinessRuleError } from '@/lib/errors';
import { requireRole } from '@/app/middleware/require-role';
import { clientProfilesService } from '@/features/phase-3-reassignment/client-profiles/client-profiles.service';

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
      let upload;

      try {
        upload = await request.file();
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'FST_INVALID_MULTIPART_CONTENT_TYPE'
        ) {
          throw new BusinessRuleError('A client profile import file is required.');
        }

        throw error;
      }

      if (!upload) {
        throw new BusinessRuleError('A client profile import file is required.');
      }

      ClientProfileImportRequestSchema.parse({
        fileName: upload.filename,
        mimeType: upload.mimetype,
      });

      const result = await clientProfilesService.importClientProfile(upload);

      return reply.code(201).send(result);
    },
  );

  app.post(
    '/client-profiles/reassign/preflight',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])],
    },
    async (request, reply) => {
      const body = ClientProfileReassignSchema.parse(request.body);
      const result = await clientProfilesService.preflightReassignment(body, request.authUser);

      return reply.code(200).send(result);
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

