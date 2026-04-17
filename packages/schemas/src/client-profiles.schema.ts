import { z } from 'zod';

const caseStatusSchema = z.enum([
  'Uncontacted',
  'Contacted',
  'For Approval',
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
  search: z.string().trim().min(1).max(100).optional(),
});
export type ListClientProfilesQuery = z.infer<typeof ListClientProfilesQuerySchema>;

export const ClientProfileSchema = z.object({
  id: z.string().uuid(),
  assignedAgentId: z.string().uuid().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  policyNumber: z.string(),
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
