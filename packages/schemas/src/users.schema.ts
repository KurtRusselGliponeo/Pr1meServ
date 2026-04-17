import { z } from 'zod';

import { userRoleSchema } from './auth.schema';

export const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  role: userRoleSchema.optional(),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

export const ManagedUserSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  role: userRoleSchema,
  createdAtUtc: z.string().datetime(),
  updatedAtUtc: z.string().datetime(),
  deletedAtUtc: z.string().datetime().nullable(),
});
export type ManagedUser = z.infer<typeof ManagedUserSchema>;

export const ListUsersResponseSchema = z.object({
  data: z.array(ManagedUserSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().min(1).max(100),
    hasNextPage: z.boolean(),
  }),
});
export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>;

export const CreateUserSchema = z.object({
  firstName: z.string().trim().min(2, 'First name is required.'),
  lastName: z.string().trim().min(2, 'Last name is required.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password is too long.'),
  role: userRoleSchema,
});
export type CreateUser = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  firstName: z.string().trim().min(2, 'First name is required.'),
  lastName: z.string().trim().min(2, 'Last name is required.'),
  role: userRoleSchema,
});
export type UpdateUser = z.infer<typeof UpdateUserSchema>;

export const UserActionResponseSchema = z.object({
  message: z.string().min(1),
});
export type UserActionResponse = z.infer<typeof UserActionResponseSchema>;
