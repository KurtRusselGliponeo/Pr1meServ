import { z } from 'zod';
export { userRoleSchema, userRoles, type UserRole } from './auth.schema';

export const systemRoles = ['Admin', 'BranchManager', 'Agent'] as const;
export const systemRoleSchema = z.enum(systemRoles);
export type SystemRole = z.infer<typeof systemRoleSchema>;

export const caseStatuses = [
  'Uncontacted',
  'Contacted',
  'Submitted',
  'Reviewed',
  'Completed',
  'Returned',
] as const;
export const caseStatusSchema = z.enum(caseStatuses);
export type CaseStatus = z.infer<typeof caseStatusSchema>;

export const policyStatuses = ['Active', 'Lapsed', 'Cancelled', 'Matured'] as const;
export const policyStatusSchema = z.enum(policyStatuses);
export type PolicyStatus = z.infer<typeof policyStatusSchema>;

export const loginPayloadSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});
export type LoginPayload = z.infer<typeof loginPayloadSchema>;
