import { z } from 'zod';

export const userRoles = ['Admin', 'BranchManager', 'Agent'] as const;
export const userRoleSchema = z.enum(userRoles);
export type UserRole = z.infer<typeof userRoleSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: z.object({
    id: z.string().uuid(),
    role: userRoleSchema,
    agentCode: z.string().nullable(),
  }),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
});
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
