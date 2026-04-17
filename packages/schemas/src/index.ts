import { z } from 'zod';

export * from './auth.schema';
export * from './agents.schema';
export * from './background-jobs.schema';
export * from './client-profile-import.schema';
export * from './client-profile-reassign.schema';
export * from './client-profiles.schema';
export * from './performance-metrics.schema';
export * from './users.schema';

export const systemRoles = ['Admin', 'BranchManager', 'Agent'] as const;
export const systemRoleSchema = z.enum(systemRoles);
export type SystemRole = z.infer<typeof systemRoleSchema>;

export const caseStatuses = [
  'Uncontacted',
  'Contacted',
  'For Approval',
  'Forms Submitted',
  'BM Signed',
  'Done',
  'Returned',
  'Orphan',
] as const;
export const caseStatusSchema = z.enum(caseStatuses);
export type CaseStatus = z.infer<typeof caseStatusSchema>;

export const policyStatuses = ['Active', 'Lapsed', 'Cancelled', 'Matured'] as const;
export const policyStatusSchema = z.enum(policyStatuses);
export type PolicyStatus = z.infer<typeof policyStatusSchema>;
