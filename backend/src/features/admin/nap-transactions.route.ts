import type { FastifyPluginAsync } from 'fastify';
import {
  listManualNapTransactionsQuerySchema,
  manualNapTransactionInputSchema,
  updateManualNapTransactionSchema,
} from '@a1prime/schemas';

import { requireRole } from '@/app/middleware/require-role';
import { adminNapTransactionsService } from '@/features/admin/nap-transactions.service';

const adminNapTransactionsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/admin/nap-transactions',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const query = listManualNapTransactionsQuerySchema.parse(request.query);
      const result = await adminNapTransactionsService.listTransactions(query, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.get(
    '/admin/nap-transactions/:transactionId',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const { transactionId } = request.params as { transactionId: string };
      const result = await adminNapTransactionsService.getTransactionDetail(transactionId, request.authUser);
      return reply.code(200).send(result);
    },
  );

  app.post(
    '/admin/nap-transactions',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const body = manualNapTransactionInputSchema.parse(request.body);
      const result = await adminNapTransactionsService.createTransaction(body, request.authUser);
      return reply.code(201).send(result);
    },
  );

  app.patch(
    '/admin/nap-transactions/:transactionId',
    { preHandler: [app.authenticate, requireRole(['Admin'])] },
    async (request, reply) => {
      const { transactionId } = request.params as { transactionId: string };
      const body = updateManualNapTransactionSchema.parse(request.body);
      const result = await adminNapTransactionsService.updateTransaction(
        transactionId,
        body,
        request.authUser,
      );
      return reply.code(200).send(result);
    },
  );
};

export default adminNapTransactionsRoutes;
