import api from '@/lib/api';
import type { AuthResponse, LoginRequest } from '../types/auth.types';

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', payload);
  return response.data;
}

export async function getCurrentUser(): Promise<AuthResponse['user']> {
  const response = await api.get<{ user: AuthResponse['user'] }>('/auth/me');
  return response.data.user;
}
