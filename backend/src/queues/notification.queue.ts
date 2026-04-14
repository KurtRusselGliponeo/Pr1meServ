import { Queue } from 'bullmq';
import { redis } from '../lib/redis';

/**
 * Shared notification queue singleton for deferred outbound notifications.
 *
 * @returns A BullMQ queue singleton.
 * @throws Never throws directly during export construction; queue operations may throw later.
 */
export function createNotificationQueue(): Queue {
  return new Queue('notification-queue', {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });
}

export const notificationQueue = createNotificationQueue();
