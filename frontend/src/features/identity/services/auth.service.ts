import axios from 'axios';

import api from '@/lib/api';
import type { AuthResponse, LoginRequest } from '../types/auth.types';

interface BackendIdentityUser {
  id: string;
  role: AuthResponse['user']['role'];
  agentCode: string | null;
}

interface BackendLoginResponse {
  accessToken: string;
  user: BackendIdentityUser;
}

interface BackendMeResponse {
  user: BackendIdentityUser;
}

function mapAuthenticatedUser(user: BackendIdentityUser): AuthResponse['user'] {
  const [firstName = 'A1', lastName = 'Prime'] = (user.agentCode ?? `${user.role} User`).split(
    /[\s-]+/,
  );

  return {
    id: user.id,
    email: `${user.agentCode ?? user.role.toLowerCase()}@a1prime.local`,
    firstName,
    lastName,
    role: user.role,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const response = await api.post<BackendLoginResponse>('/auth/login', payload);
  const { accessToken, user } = response.data;

  return {
    user: mapAuthenticatedUser(user),
    tokens: {
      accessToken,
      refreshToken: '',
    },
  };
}

export async function getCurrentUser(): Promise<AuthResponse['user']> {
  const response = await api.get<BackendMeResponse>('/auth/me');
  return mapAuthenticatedUser(response.data.user);
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
