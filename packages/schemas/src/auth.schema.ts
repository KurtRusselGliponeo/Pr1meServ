import { z } from 'zod';

export const userRoles = ['Admin', 'BranchManager', 'Agent'] as const;
export const userRoleSchema = z.enum(userRoles);
export type UserRole = z.infer<typeof userRoleSchema>;
