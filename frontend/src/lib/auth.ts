export const ACCESS_TOKEN_KEY = 'a1prime.accessToken';
export const AUTH_USER_KEY = 'a1prime.authUser';
export const ACCESS_TOKEN_COOKIE = 'a1prime_access_token';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getAccessToken(): string | null {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAuthCookie(token: string) {
  if (!isBrowser()) {
    return;
  }

  document.cookie = `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearAuthCookie() {
  if (!isBrowser()) {
    return;
  }

  document.cookie = `${ACCESS_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function persistAuthSession(session: {
  accessToken: string;
  user: unknown;
}) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
  setAuthCookie(session.accessToken);
}

export function clearAuthSession() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  clearAuthCookie();
}

export function getStoredAuthUser<T>(): T | null {
  if (!isBrowser()) {
    return null;
  }

  const rawUser = window.localStorage.getItem(AUTH_USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as T;
  } catch {
    return null;
  }
}
