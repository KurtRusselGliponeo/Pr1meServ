import axios from 'axios';
import { AuthMeResponseSchema, LoginResponseSchema } from '@a1prime/schemas';

import api from '@/lib/api';
import type { AuthResponse, LoginRequest } from '../types/auth.types';

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const response = await api.post('/auth/login', payload);
  const { accessToken, user } = LoginResponseSchema.parse(response.data);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAtUtc,
      updatedAt: user.updatedAtUtc,
    },
    tokens: {
      accessToken,
      refreshToken: '',
    },
  };
}

export async function getCurrentUser(): Promise<AuthResponse['user']> {
  const response = await api.get('/auth/me');
  const { user } = AuthMeResponseSchema.parse(response.data);

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAtUtc,
    updatedAt: user.updatedAtUtc,
  };
}

export async function refreshAccessToken(): Promise<string> {
  const response = await axios.post<{ accessToken: string }>(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/api/v1/auth/refresh`,
    {},
    {
      withCredentials: true,
    },
  );

  return response.data.accessToken;
}

export async function logoutRequest(): Promise<void> {
  await api.post('/auth/logout');
}
