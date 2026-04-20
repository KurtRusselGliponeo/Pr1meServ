import { desc, inArray } from 'drizzle-orm';

import type { NotificationLogsResponse } from '@a1prime/schemas';
import { db } from '@/db/client';
import { systemAuditLogs } from '@/schema';

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
    const rows = await db
      .select({
        id: systemAuditLogs.id,
        action: systemAuditLogs.action,
        newValue: systemAuditLogs.newValue,
        createdAtUtc: systemAuditLogs.createdAt,
      })
      .from(systemAuditLogs)
      .where(inArray(systemAuditLogs.action, ['email.enqueued', 'email.sent', 'email.failed']))
      .orderBy(desc(systemAuditLogs.createdAt));

    return {
      data: rows.map((row) => ({
        id: row.id,
        action: row.action,
        recipient: String(row.newValue?.to ?? 'unknown@local'),
        subject: String(row.newValue?.subject ?? 'No subject'),
        status: toStatus(row.action),
        createdAtUtc: row.createdAtUtc.toISOString(),
      })),
    };
  }
}

export const notificationsService = new NotificationsService();
