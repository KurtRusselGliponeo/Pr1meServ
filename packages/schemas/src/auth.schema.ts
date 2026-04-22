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
  needsPasswordReset: z.boolean(),
  createdAtUtc: z.string().datetime(),
  updatedAtUtc: z.string().datetime(),
});
export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema>;

export const ResetPasswordRequestSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(128, 'Password is too long.')
      .regex(/[a-z]/, 'Password must contain a lowercase letter.')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
      .regex(/[0-9]/, 'Password must contain a number.')
      .regex(/[^A-Za-z0-9]/, 'Password must contain a special character.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

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
