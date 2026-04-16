import api from '@/lib/api';
import type { AuthResponse, LoginRequest } from '../types/auth.types';

// Backend returns: { accessToken: string, user: { id, role, agentCode } }
// AuthResponse expected by auth-context: { tokens: { accessToken, refreshToken }, user }
// The refresh token is stored in an HTTP-only cookie by the backend automatically.
interface BackendLoginResponse {
  accessToken: string;
  user: AuthResponse['user'];
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const response = await api.post<BackendLoginResponse>('/auth/login', payload);
  const { accessToken, user } = response.data;

  // Map flat shape → nested shape expected by auth-context
  return {
    user,
    tokens: {
      accessToken,
      // Refresh token is handled server-side via HttpOnly cookie; not exposed to JS
      refreshToken: '',
    },
  };
}

export async function getCurrentUser(): Promise<AuthResponse['user']> {
  const response = await api.get<{ user: AuthResponse['user'] }>('/auth/me');
  return response.data.user;
}
