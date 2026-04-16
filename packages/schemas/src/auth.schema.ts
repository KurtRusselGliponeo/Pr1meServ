import { z } from 'zod';

export const userRoles = ['Admin', 'BranchManager', 'Agent'] as const;
export const userRoleSchema = z.enum(userRoles);
export type UserRole = z.infer<typeof userRoleSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthenticatedUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: userRoleSchema,
  agentCode: z.string().nullable(),
  createdAtUtc: z.string().datetime(),
  updatedAtUtc: z.string().datetime(),
});
export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: AuthenticatedUserSchema,
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
});
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;

export const AuthMeResponseSchema = z.object({
  user: AuthenticatedUserSchema,
});
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;
