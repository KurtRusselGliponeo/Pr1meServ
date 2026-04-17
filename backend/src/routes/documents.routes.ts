import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { documentsService } from '@/services/documents.service';
import { requireRole } from '@/middleware/require-role';

/**
 * Registers S3 and Cloudflare upload logic mappings for the API routing instance.
 */
export const documentsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/documents/presigned-url', {
    preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])]
  }, async (request, reply) => {
    const schema = z.object({
      fileName: z.string(),
      mimeType: z.string(),
      category: z.string()
    });
    const parsed = schema.parse(request.body);
    const result = await documentsService.generatePresignedUrl(parsed.fileName, parsed.mimeType, parsed.category, request.authUser.sub);
    return reply.code(200).send(result);
  });
  
  app.get('/documents', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const parsed = z.object({ category: z.string().optional() }).parse(request.query);
    return reply.code(200).send(await documentsService.fetchDocuments(parsed.category));
  });

  app.patch('/documents/:id/pin', {
    preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])]
  }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { isPinned } = z.object({ isPinned: z.boolean() }).parse(request.body);
    const result = await documentsService.updatePinnedState(id, isPinned);
    return reply.code(result ? 200 : 404).send(result ?? { message: 'Document not found' });
  });
};

export default documentsRoutes;
