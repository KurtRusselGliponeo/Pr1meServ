export const ACCESS_TOKEN_KEY = 'a1prime.accessToken';
export const AUTH_USER_KEY = 'a1prime.authUser';
let inMemoryAccessToken: string | null = null;
let inMemoryAuthUser: unknown = null;

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function persistAuthSession(session: { accessToken: string; user: unknown }) {
  inMemoryAccessToken = session.accessToken;
  inMemoryAuthUser = session.user;
}

export function clearAuthSession() {
  inMemoryAccessToken = null;
  inMemoryAuthUser = null;
}

export function getStoredAuthUser<T>(): T | null {
  return (inMemoryAuthUser as T | null) ?? null;
}
