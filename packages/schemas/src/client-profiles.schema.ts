import { z } from 'zod';

const caseStatusSchema = z.enum([
  'Uncontacted',
  'Contacted',
  'Forms Submitted',
  'BM Signed',
  'Done',
  'Returned',
  'Orphan',
]);

const policyStatusSchema = z.enum(['Active', 'Lapsed', 'Cancelled', 'Matured']);

export const ListClientProfilesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: caseStatusSchema.optional(),
  agentId: z.string().uuid().optional(),
  branchCode: z.string().trim().min(1).max(50).optional(),
  product: z.string().trim().min(1).max(120).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});
export type ListClientProfilesQuery = z.infer<typeof ListClientProfilesQuerySchema>;

export const ClientProfileSchema = z.object({
  id: z.string().uuid(),
  assignedAgentId: z.string().uuid().nullable(),
  branchCode: z.string().min(1),
  firstName: z.string(),
  lastName: z.string(),
  policyNumber: z.string(),
  productType: z.string().nullable().optional(),
  planCode: z.string().nullable().optional(),
  modalPremium: z.string(),
  api: z.string(),
  sumAssured: z.string(),
  commissionAmount: z.string(),
  caseStatus: caseStatusSchema,
  policyStatus: policyStatusSchema,
  createdAtUtc: z.string().datetime(),
  updatedAtUtc: z.string().datetime(),
});
export type ClientProfile = z.infer<typeof ClientProfileSchema>;

export const ListClientProfilesResponseSchema = z.object({
  data: z.array(ClientProfileSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().min(1).max(100),
    hasNextPage: z.boolean(),
  }),
});
export type ListClientProfilesResponse = z.infer<typeof ListClientProfilesResponseSchema>;

export const ListOrphanClientsResponseSchema = z.object({
  data: z.array(ClientProfileSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
  }),
});
export type ListOrphanClientsResponse = z.infer<typeof ListOrphanClientsResponseSchema>;

export const UpdateClientCaseStatusSchema = z.object({
  caseStatus: caseStatusSchema.refine((status) => status !== 'Orphan', {
    message: 'Orphan is an operational-only routing state.',
  }),
  reason: z.string().trim().max(500).optional(),
});
export type UpdateClientCaseStatus = z.infer<typeof UpdateClientCaseStatusSchema>;

export const ClientTimelineItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['assignment', 'audit', 'approval', 'document', 'notification', 'status']),
  action: z.string().min(1),
  actorUserId: z.string().uuid().nullable(),
  actorName: z.string().nullable(),
  title: z.string().min(1),
  description: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAtUtc: z.string().datetime(),
});
export type ClientTimelineItem = z.infer<typeof ClientTimelineItemSchema>;

export const ClientTimelineResponseSchema = z.object({
  data: z.array(ClientTimelineItemSchema),
});
export type ClientTimelineResponse = z.infer<typeof ClientTimelineResponseSchema>;
