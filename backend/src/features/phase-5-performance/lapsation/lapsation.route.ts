import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import {
  ListLapsationAlertsQuerySchema,
  UpdatePolicyStatusInputSchema,
} from '@a1prime/schemas';

import { BadRequestError } from '@/lib/errors';
import { requireRole } from '@/app/middleware/require-role';
import { lapsationService } from '@/features/phase-5-performance/lapsation/lapsation.service';
import { createImportQueue } from '@/queues/import.queue';

const lapsationRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/lapsation',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager', 'Agent'])],
    },
    async (request, reply) => {
      const query = ListLapsationAlertsQuerySchema.parse(request.query);
      const result = await lapsationService.getDashboard(request.authUser, query);
      return reply.code(200).send(result);
    },
  );

  app.patch(
    '/lapsation/policies/:policyId/status',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])],
    },
    async (request, reply) => {
      const { policyId } = z.object({ policyId: z.string().uuid() }).parse(request.params);
      const body = UpdatePolicyStatusInputSchema.parse(request.body);
      const result = await lapsationService.updatePolicyStatus(policyId, body, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.post(
    '/lapsation/:id/reinstate',
    {
      preHandler: [app.authenticate, requireRole(['Admin', 'BranchManager'])],
    },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z
        .object({
          reason: z.string().trim().min(1).max(255).optional(),
          notes: z.string().trim().max(2000).nullable().optional(),
        })
        .parse(request.body ?? {});
      const result = await lapsationService.reinstateRecord(id, request.authUser, body);
      return reply.code(200).send(result);
    },
  );

  app.post(
    '/lapsation/import',
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
          throw new BadRequestError('A lapsation import workbook is required.');
        }

        throw error;
      }

      if (!upload) {
        throw new BadRequestError('A lapsation import workbook is required.');
      }

      if (!upload.filename.toLowerCase().endsWith('.xlsx')) {
        throw new BadRequestError('Lapsation import must be uploaded as an .xlsx workbook.');
      }

      const buffer = await upload.toBuffer();

      if (!upload.mimetype.includes('spreadsheetml')) {
        throw new BadRequestError('Lapsation import must use the Excel .xlsx MIME type.');
      }

      const hasZipSignature =
        buffer.length >= 4 &&
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
        (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08);

      if (!hasZipSignature) {
        throw new BadRequestError('Uploaded lapsation workbook could not be parsed as Excel.');
      }

      try {
        XLSX.read(buffer, { type: 'buffer' });
      } catch {
        throw new BadRequestError('Uploaded lapsation workbook could not be parsed as Excel.');
      }

      let importQueue;

      try {
        importQueue = createImportQueue();
      } catch {
        throw new BadRequestError(
          'Lapsation imports are unavailable because background jobs are disabled in this environment.',
        );
      }

      await importQueue.add('process-lapsation-upload', {
        importBatchId: randomUUID(),
        fileName: upload.filename,
        initiatedByUserId: request.authUser.sub,
        workbookBase64: buffer.toString('base64'),
      });

      return reply.code(202).send({
        accepted: true,
        fileName: upload.filename,
      });
    },
  );
};

export default lapsationRoutes;

