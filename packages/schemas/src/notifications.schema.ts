import { z } from 'zod';

export const NotificationLogItemSchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  recipient: z.string().email().or(z.string().min(1)),
  subject: z.string(),
  status: z.enum(['queued', 'sent', 'failed']),
  createdAtUtc: z.string().datetime(),
});
export type NotificationLogItem = z.infer<typeof NotificationLogItemSchema>;

export const NotificationLogsResponseSchema = z.object({
  data: z.array(NotificationLogItemSchema),
});
export type NotificationLogsResponse = z.infer<typeof NotificationLogsResponseSchema>;
