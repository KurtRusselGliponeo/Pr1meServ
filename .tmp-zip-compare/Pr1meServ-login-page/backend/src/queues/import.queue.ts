import { createQueue, type QueueDefinition } from '../shared/lib/queue';
import type {
  ApeImportJobPayload,
  LapsationUploadJobPayload,
  NapImportJobPayload,
  PerImportJobPayload,
  RecImportJobPayload,
} from '@a1prime/schemas';

export interface ImportQueueJobs {
  'process-lapsation-upload': LapsationUploadJobPayload;
  'process-nap-import': NapImportJobPayload;
  'process-per-import': PerImportJobPayload;
  'process-ape-import': ApeImportJobPayload;
  'process-rec-import': RecImportJobPayload;
}

export const importQueueDefinition: QueueDefinition = {
  name: 'import-queue',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 200 },
  },
};

/**
 * Shared import queue singleton for future background file-processing jobs.
 *
 * @returns A typed queue handle.
 */
export function createImportQueue() {
  return createQueue<ImportQueueJobs>(importQueueDefinition);
}
