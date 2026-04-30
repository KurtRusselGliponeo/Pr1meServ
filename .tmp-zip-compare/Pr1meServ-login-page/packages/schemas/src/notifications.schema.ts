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

export const AdminSystemLogItemSchema = z.object({
  id: z.string().min(1),
  source: z.enum(['audit', 'notification']),
  category: z.enum([
    'new-policy',
    'upload',
    'return',
    'approval',
    'reassignment',
    'notification',
    'user',
  ]),
  action: z.string(),
  title: z.string(),
  description: z.string(),
  actorUserId: z.string().uuid().nullable(),
  entityName: z.string().nullable(),
  entityId: z.string().nullable(),
  createdAtUtc: z.string().datetime(),
});
export type AdminSystemLogItem = z.infer<typeof AdminSystemLogItemSchema>;

export const AdminSystemLogsResponseSchema = z.object({
  data: z.array(AdminSystemLogItemSchema),
});
export type AdminSystemLogsResponse = z.infer<typeof AdminSystemLogsResponseSchema>;

export const AdminSearchResultItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['agent', 'client']),
  title: z.string(),
  subtitle: z.string(),
  href: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});
export type AdminSearchResultItem = z.infer<typeof AdminSearchResultItemSchema>;

export const AdminSearchResponseSchema = z.object({
  data: z.array(AdminSearchResultItemSchema),
});
export type AdminSearchResponse = z.infer<typeof AdminSearchResponseSchema>;

export const AdminOverviewBranchSummarySchema = z.object({
  branchCode: z.string(),
  activeAgents: z.number().int().nonnegative(),
  orphanClients: z.number().int().nonnegative(),
  pendingApprovals: z.number().int().nonnegative(),
  formsSubmitted: z.number().int().nonnegative(),
  returnedCases: z.number().int().nonnegative(),
});
export type AdminOverviewBranchSummary = z.infer<typeof AdminOverviewBranchSummarySchema>;

export const AdminOverviewResponseSchema = z.object({
  totals: z.object({
    activeUsers: z.number().int().nonnegative(),
    archivedUsers: z.number().int().nonnegative(),
    activeAgents: z.number().int().nonnegative(),
    orphanClients: z.number().int().nonnegative(),
    pendingApprovals: z.number().int().nonnegative(),
    returnedCases: z.number().int().nonnegative(),
    formsSubmitted: z.number().int().nonnegative(),
  }),
  branches: z.array(AdminOverviewBranchSummarySchema),
});
export type AdminOverviewResponse = z.infer<typeof AdminOverviewResponseSchema>;
