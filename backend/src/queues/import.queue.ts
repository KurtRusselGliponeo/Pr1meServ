import { Queue } from 'bullmq';
import { redis } from '../lib/redis';

/**
 * Shared import queue singleton for background file-processing jobs.
 *
 * @returns A BullMQ queue singleton.
 * @throws Never throws directly during export construction; queue operations may throw later.
 */
export function createImportQueue(): Queue {
  return new Queue('import-queue', {
    connection: redis,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 200 },
    },
  });
}

export const importQueue = createImportQueue();
