import { EmailQueuePayloadSchema, type EmailQueuePayload } from '@a1prime/schemas';

import { notificationQueue } from '@/queues/notification.queue';
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
    await notificationQueue.add('send-email', EmailQueuePayloadSchema.parse(payload));
  }

  /**
   * Processes a BullMQ email job and delegates the actual send to the mail transport.
   *
   * @param payload Raw queue payload for an outbound email.
   * @returns A promise that resolves when the email provider accepts the send request.
   */
  async processEmailJob(payload: EmailQueuePayload): Promise<void> {
    const parsedPayload = EmailQueuePayloadSchema.parse(payload);
    await sendQueuedEmail(parsedPayload);
  }
}

export const emailQueueService = new EmailQueueService();
