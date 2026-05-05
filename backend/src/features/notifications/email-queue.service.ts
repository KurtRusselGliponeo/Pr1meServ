import { EmailQueuePayloadSchema, type EmailQueuePayload } from '@a1prime/schemas';
import { addBreadcrumb } from '@sentry/core';

import { db } from '@/db/client';
import { isRedisEnabled } from '@/lib/redis';
import { createNotificationQueue } from '@/queues/notification.queue';
import { notifications } from '@/schema';
import { logSystemAudit } from '@/shared/lib/audit';
import { sendQueuedEmail } from '@/shared/mail/mailer';

/**
 * Encapsulates queue-safe email notification operations.
 */
export class EmailQueueService {
  private canAttemptInlineEmail() {
    return Boolean(
      process.env.SMTP_USER?.trim() &&
        process.env.GMAIL_CLIENT_ID?.trim() &&
        process.env.GMAIL_CLIENT_SECRET?.trim() &&
        process.env.GMAIL_REFRESH_TOKEN?.trim(),
    );
  }

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
    } else if (this.canAttemptInlineEmail()) {
      sendQueuedEmail(parsedPayload).catch(async (error) => {
        try {
          await db.insert(notifications).values({
            channel: 'email',
            subject: parsedPayload.subject,
            message: parsedPayload.html ?? parsedPayload.text ?? '',
            status: 'failed',
            metadata: JSON.stringify({
              to: parsedPayload.to,
              error: error instanceof Error ? error.message : String(error),
            }),
          });
        } catch {
          // Silent catch for background db error
        }
      });
      
      // Assume queued/sent for the immediate response
      await logSystemAudit({
        action: 'email.sent.inline.async',
        entityName: 'NotificationEmail',
        newValue: {
          to: parsedPayload.to,
          subject: parsedPayload.subject,
        },
      });

      await db.insert(notifications).values({
        channel: 'email',
        subject: parsedPayload.subject,
        message: parsedPayload.html ?? parsedPayload.text ?? '',
        status: 'sent',
        metadata: JSON.stringify({
          to: parsedPayload.to,
        }),
      });

      return;
    } else {
      await logSystemAudit({
        action: 'email.skipped.inline',
        entityName: 'NotificationEmail',
        newValue: {
          to: parsedPayload.to,
          subject: parsedPayload.subject,
          reason: 'Missing local mail configuration.',
        },
      });

      await db.insert(notifications).values({
        channel: 'email',
        subject: parsedPayload.subject,
        message: parsedPayload.html ?? parsedPayload.text ?? '',
        status: 'skipped',
        metadata: JSON.stringify({
          to: parsedPayload.to,
          reason: 'Missing local mail configuration.',
        }),
      });

      return;
    }

    await logSystemAudit({
      action: isRedisEnabled ? 'email.enqueued' : 'email.sent.inline',
      entityName: 'NotificationEmail',
      newValue: {
        to: parsedPayload.to,
        subject: parsedPayload.subject,
      },
    });

    await db.insert(notifications).values({
      channel: 'email',
      subject: parsedPayload.subject,
      message: parsedPayload.html ?? parsedPayload.text ?? '',
      status: isRedisEnabled ? 'queued' : 'sent',
      metadata: JSON.stringify({
        to: parsedPayload.to,
      }),
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
    
    const maskedEmail = parsedPayload.to.replace(/(.{2})(.*)(@.*)/, '$1***$3');
    const templateType = typeof parsedPayload.metadata?.templateType === 'string'
      ? parsedPayload.metadata.templateType
      : 'GENERAL_NOTIFICATION';

    addBreadcrumb({
      category: 'email.send',
      message: 'Attempting to send email from queue',
      level: 'info',
      data: {
        recipient: maskedEmail,
        templateType,
      },
    });

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
      await db.insert(notifications).values({
        channel: 'email',
        subject: parsedPayload.subject,
        message: parsedPayload.html ?? parsedPayload.text ?? '',
        status: 'sent',
        metadata: JSON.stringify({
          to: parsedPayload.to,
        }),
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
      await db.insert(notifications).values({
        channel: 'email',
        subject: parsedPayload.subject,
        message: parsedPayload.html ?? parsedPayload.text ?? '',
        status: 'failed',
        metadata: JSON.stringify({
          to: parsedPayload.to,
        }),
      });
      throw error;
    }
  }
}

export const emailQueueService = new EmailQueueService();
