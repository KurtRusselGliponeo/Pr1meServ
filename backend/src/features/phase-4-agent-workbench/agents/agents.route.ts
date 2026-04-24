import type { FastifyPluginAsync } from 'fastify';
import {
  BranchManagerDashboardQuerySchema,
  DelistAgentRequestSchema,
  ListAgentsQuerySchema,
  UpdateAgentProfileSchema,
} from '@a1prime/schemas';
import { requireRole } from '@/app/middleware/require-role';
import { scanForMalware } from '@/app/middleware/malware-scanner';
import { BusinessRuleError } from '@/lib/errors';
import { agentsService } from '@/features/phase-4-agent-workbench/agents/agents.service';

/**
 * Registers agent profile routes.
 *
 * @param app Fastify application instance.
 * @returns Route registration completion.
 */
const agentsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/agents/me/dashboard',
    {
      preHandler: [app.authenticate, requireRole(['Agent'])],
    },
    async (request, reply) => {
      const result = await agentsService.getAgentDashboard(request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.get(
    '/agents/branch/dashboard',
    {
      preHandler: [app.authenticate, requireRole(['BranchManager'])],
    },
    async (request, reply) => {
      const query = BranchManagerDashboardQuerySchema.parse(request.query);
      const result = await agentsService.getBranchManagerDashboard(request.authUser, query);
      return reply.code(200).send(result);
    },
  );

  app.get(
    '/agents',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])],
    },
    async (request, reply) => {
      const query = ListAgentsQuerySchema.parse(request.query);
      const result = await agentsService.listAgents(query);
      return reply.code(200).send(result);
    },
  );

  app.get(
    '/agents/:agentId',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])],
    },
    async (request, reply) => {
      const params = request.params as { agentId: string };
      const result = await agentsService.getAgentProfile(params.agentId, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.patch(
    '/agents/:agentId',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])],
    },
    async (request, reply) => {
      const params = request.params as { agentId: string };
      const body = UpdateAgentProfileSchema.parse(request.body);
      const result = await agentsService.updateAgentProfile(
        params.agentId,
        body,
        request.authUser,
        request.authUser.id,
      );
      return reply.code(200).send(result);
    },
  );

  app.post(
    '/agents/:agentId/profile-photo',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])],
    },
    async (request, reply) => {
      const params = request.params as { agentId: string };
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
          throw new BusinessRuleError('A profile image file is required.');
        }

        throw error;
      }

      if (!upload) {
        throw new BusinessRuleError('A profile image file is required.');
      }

      await scanForMalware(upload);

      const result = await agentsService.uploadProfilePhoto(
        params.agentId,
        upload,
        request.authUser,
        request.authUser.id,
      );
      return reply.code(200).send(result);
    },
  );

  app.post(
    '/agents/delist',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])],
    },
    async (request, reply) => {
      const body = DelistAgentRequestSchema.parse(request.body);
      const result = await agentsService.delistAgent(body.targetAgentCode, request.authUser.id);
      return reply.code(200).send(result);
    },
  );
};

export default agentsRoutes;

