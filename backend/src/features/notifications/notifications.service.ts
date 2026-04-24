import { desc, inArray } from 'drizzle-orm';

import type { NotificationLogsResponse } from '@a1prime/schemas';
import { db } from '@/db/client';
import { notifications, systemAuditLogs } from '@/schema';

function toStatus(action: string): 'queued' | 'sent' | 'failed' {
  if (action === 'email.sent') {
    return 'sent';
  }

  if (action === 'email.failed') {
    return 'failed';
  }

  return 'queued';
}

export class NotificationsService {
  async getNotificationLogs(): Promise<NotificationLogsResponse> {
    const [auditRows, notificationRows] = await Promise.all([
      db
      .select({
        id: systemAuditLogs.id,
        action: systemAuditLogs.action,
        newValue: systemAuditLogs.newValue,
        createdAtUtc: systemAuditLogs.createdAt,
      })
      .from(systemAuditLogs)
      .where(inArray(systemAuditLogs.action, ['email.enqueued', 'email.sent', 'email.failed']))
      .orderBy(desc(systemAuditLogs.createdAt)),
      db
        .select({
          id: notifications.id,
          subject: notifications.subject,
          message: notifications.message,
          status: notifications.status,
          createdAtUtc: notifications.createdAtUtc,
        })
        .from(notifications)
        .orderBy(desc(notifications.createdAtUtc)),
    ]);

    return {
      data: [
        ...auditRows.map((row) => ({
          id: row.id,
          action: row.action,
          recipient: String(row.newValue?.to ?? 'unknown@local'),
          subject: String(row.newValue?.subject ?? 'No subject'),
          status: toStatus(row.action),
          createdAtUtc: row.createdAtUtc.toISOString(),
        })),
        ...notificationRows.map((row) => ({
          id: row.id,
          action: 'notification.recorded',
          recipient: 'in-app',
          subject: row.subject,
          status: row.status as 'queued' | 'sent' | 'failed',
          createdAtUtc: row.createdAtUtc.toISOString(),
        })),
      ].sort((left, right) => right.createdAtUtc.localeCompare(left.createdAtUtc)),
    };
  }
}

export const notificationsService = new NotificationsService();
