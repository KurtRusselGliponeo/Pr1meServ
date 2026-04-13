export interface AuthenticatedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  user: AuthenticatedUser
  tokens: AuthTokens
}
