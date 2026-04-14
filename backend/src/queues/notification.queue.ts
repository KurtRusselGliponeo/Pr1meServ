import { createQueue, type QueueDefinition } from '../shared/lib/queue';

export interface NotificationQueueJobs {
  placeholder: {
    channel: 'email' | 'sms';
    recipient: string;
  };
}

const notificationQueueDefinition: QueueDefinition = {
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
  return createQueue(notificationQueueDefinition);
}

export const notificationQueue = createNotificationQueue();
