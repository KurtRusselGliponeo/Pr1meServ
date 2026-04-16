import type { NotificationQueueJobs } from '@/queues/notification.queue';
import { notificationQueueDefinition } from '@/queues/notification.queue';
import { createLoggedWorker } from '@/shared/lib/queue';
import { emailQueueService } from '@/services/email-queue.service';

export function createEmailWorker() {
  return createLoggedWorker<NotificationQueueJobs>(
    {
      queue: notificationQueueDefinition,
      concurrency: 5,
    },
    async (job) => {
      await emailQueueService.processEmailJob(job.data);
    },
  );
}
