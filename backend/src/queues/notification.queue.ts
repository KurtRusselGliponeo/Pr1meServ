import { createQueue, type QueueDefinition } from '../shared/lib/queue';
import type { EmailQueuePayload } from '@a1prime/schemas';

export interface NotificationQueueJobs {
  'send-email': EmailQueuePayload;
}

export const notificationQueueDefinition: QueueDefinition = {
  name: 'notification-queue',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
};

/**
 * Shared notification queue singleton for deferred outbound notifications.
 *
 * @returns A typed queue handle.
 */
export function createNotificationQueue() {
  return createQueue<NotificationQueueJobs>(notificationQueueDefinition);
}

export const notificationQueue = createNotificationQueue();
