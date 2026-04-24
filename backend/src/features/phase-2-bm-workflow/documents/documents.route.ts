import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  archiveDocumentRequestSchema,
  listDocumentsQuerySchema,
  updateDocumentMetadataSchema,
} from '@a1prime/schemas';
import { documentsService } from '@/features/phase-2-bm-workflow/documents/documents.service';
import { requireRole } from '@/app/middleware/require-role';
import { scanForMalware } from '@/app/middleware/malware-scanner';

/**
 * Registers centralized document repository routes.
 */
export const documentsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/documents/upload', {
    preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])]
  }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ message: 'No file uploaded' });
    }

    await scanForMalware(data);

    const categoryField = data.fields.category;
    const descriptionField = data.fields.description;
    const keywordsField = data.fields.keywords;
    const branchCodeField = data.fields.branchCode;
    const category = Array.isArray(categoryField) ? categoryField[0] : categoryField;
    const description = Array.isArray(descriptionField) ? descriptionField[0] : descriptionField;
    const keywords = Array.isArray(keywordsField) ? keywordsField[0] : keywordsField;
    const branchCode = Array.isArray(branchCodeField) ? branchCodeField[0] : branchCodeField;

    if (!category || category.type !== 'field') {
      return reply.code(400).send({ message: 'Category is required' });
    }

    const buffer = await data.toBuffer();
    const result = await documentsService.uploadDocument({
      fileName: data.filename,
      mimeType: data.mimetype,
      category: String(category.value),
      uploaderId: request.authUser.sub,
      buffer,
      actorUser: request.authUser,
      description: description?.type === 'field' ? String(description.value) : undefined,
      branchCode: branchCode?.type === 'field' ? String(branchCode.value) : undefined,
      keywords:
        keywords?.type === 'field'
          ? String(keywords.value)
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean)
          : [],
    });
    
    return reply.code(200).send(result);
  });

  app.post('/documents/client-upload', {
    preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])]
  }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ message: 'No file uploaded' });
    }

    await scanForMalware(data);

    const clientProfileIdField = data.fields.clientProfileId;
    const categoryField = data.fields.category;
    const bucketField = data.fields.bucket;
    const clientProfileId = Array.isArray(clientProfileIdField) ? clientProfileIdField[0] : clientProfileIdField;
    const category = Array.isArray(categoryField) ? categoryField[0] : categoryField;
    const bucket = Array.isArray(bucketField) ? bucketField[0] : bucketField;

    if (!clientProfileId || clientProfileId.type !== 'field') {
      return reply.code(400).send({ message: 'clientProfileId is required' });
    }

    if (!category || category.type !== 'field') {
      return reply.code(400).send({ message: 'category is required' });
    }

    if (!bucket || bucket.type !== 'field') {
      return reply.code(400).send({ message: 'bucket is required' });
    }

    const buffer = await data.toBuffer();
    const result = await documentsService.uploadClientDocument({
      fileName: data.filename,
      mimeType: data.mimetype,
      category: String(category.value),
      bucket: String(bucket.value),
      clientProfileId: String(clientProfileId.value),
      uploaderId: request.authUser.sub,
      buffer,
      actorUser: request.authUser,
    });

    return reply.code(200).send(result);
  });
  
  app.get('/documents', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const parsed = listDocumentsQuerySchema.parse(request.query);
    return reply.code(200).send(await documentsService.fetchDocuments(parsed, request.authUser));
  });

  app.get('/documents/:id/history', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const history = await documentsService.getDocumentHistory(id, request.authUser);
    return reply.code(history.length > 0 ? 200 : 404).send(history.length > 0 ? history : { message: 'Document not found' });
  });

  app.get('/documents/:id/download', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const result = await documentsService.getDownloadUrl(id, request.authUser);
    return reply.code(200).send(result);
  });

  app.patch('/documents/:id/pin', {
    preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])]
  }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { isPinned } = z.object({ isPinned: z.boolean() }).parse(request.body);
    const result = await documentsService.updatePinnedState(id, isPinned, request.authUser);
    return reply.code(result ? 200 : 404).send(result ?? { message: 'Document not found' });
  });

  app.patch('/documents/:id/metadata', {
    preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])]
  }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateDocumentMetadataSchema.parse(request.body);
    const result = await documentsService.updateMetadata(id, body, request.authUser);
    return reply.code(200).send(result);
  });

  app.post('/documents/:id/archive', {
    preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])]
  }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = archiveDocumentRequestSchema.parse(request.body);
    const result = await documentsService.archiveDocument(id, body, request.authUser);
    return reply.code(200).send(result);
  });

  app.post('/documents/cosaf-upload-complete', {
    preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])]
  }, async (request, reply) => {
    const parsed = z.object({
      documentId: z.string().uuid(),
      clientProfileId: z.string().uuid(),
      reason: z.string().trim().max(500).optional(),
    }).parse(request.body);
    const result = await documentsService.markCosafUploadComplete(
      parsed.documentId,
      parsed.clientProfileId,
      request.authUser.sub,
      parsed.reason,
    );
    return reply.code(result ? 200 : 404).send(result ?? { message: 'COSAF document not found' });
  });
};

export default documentsRoutes;
