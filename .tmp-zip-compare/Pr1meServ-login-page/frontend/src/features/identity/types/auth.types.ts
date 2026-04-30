import type { SystemRole } from '@a1prime/schemas';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: SystemRole;
  needsPasswordReset: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: AuthenticatedUser;
  tokens: AuthTokens;
}

export interface ResetPasswordRequest {
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordWithTokenRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordWithTokenResponse {
  success: boolean;
  message: string;
}
