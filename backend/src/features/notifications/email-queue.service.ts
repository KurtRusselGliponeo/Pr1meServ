import { EmailQueuePayloadSchema, type EmailQueuePayload } from '@a1prime/schemas';

import { isRedisEnabled } from '@/lib/redis';
import { createNotificationQueue } from '@/queues/notification.queue';
import { logSystemAudit } from '@/shared/lib/audit';
import { sendQueuedEmail } from '@/shared/mail/mailer';

/**
 * Encapsulates queue-safe email notification operations.
 */
export class EmailQueueService {
  /**
   * Enqueues an outbound email for asynchronous background delivery.
   *
   * @param payload Validated email payload.
   * @returns A promise that resolves once the queue accepts the job.
   */
  async enqueueEmail(payload: EmailQueuePayload): Promise<void> {
    const parsedPayload = EmailQueuePayloadSchema.parse(payload);

    if (isRedisEnabled) {
      const notificationQueue = createNotificationQueue();
      await notificationQueue.add('send-email', parsedPayload);
    } else {
      await sendQueuedEmail(parsedPayload);
    }

    await logSystemAudit({
      action: isRedisEnabled ? 'email.enqueued' : 'email.sent.inline',
      entityName: 'NotificationEmail',
      newValue: {
        to: parsedPayload.to,
        subject: parsedPayload.subject,
      },
    });
  }

  /**
   * Processes a BullMQ email job and delegates the actual send to the mail transport.
   *
   * @param payload Raw queue payload for an outbound email.
   * @returns A promise that resolves when the email provider accepts the send request.
   */
  async processEmailJob(payload: EmailQueuePayload): Promise<void> {
    const parsedPayload = EmailQueuePayloadSchema.parse(payload);
    try {
      await sendQueuedEmail(parsedPayload);
      await logSystemAudit({
        action: 'email.sent',
        entityName: 'NotificationEmail',
        newValue: {
          to: parsedPayload.to,
          subject: parsedPayload.subject,
        },
      });
    } catch (error) {
      await logSystemAudit({
        action: 'email.failed',
        entityName: 'NotificationEmail',
        newValue: {
          to: parsedPayload.to,
          subject: parsedPayload.subject,
        },
      });
      throw error;
    }
  }
}

export const emailQueueService = new EmailQueueService();
