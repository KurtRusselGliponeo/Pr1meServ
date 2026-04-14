import { createQueue, type QueueDefinition } from '../shared/lib/queue';

export interface ImportQueueJobs {
  placeholder: {
    source: 'csv' | 'xlsx';
    initiatedByUserId: string;
  };
}

const importQueueDefinition: QueueDefinition = {
  name: 'import-queue',
  defaultJobOptions: {
    attempts: 2,
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
  return createQueue(importQueueDefinition);
}

export const importQueue = createImportQueue();
