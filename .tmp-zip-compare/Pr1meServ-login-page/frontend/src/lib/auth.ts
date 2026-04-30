export const ACCESS_TOKEN_KEY = 'a1prime.accessToken';
export const AUTH_USER_KEY = 'a1prime.authUser';
let inMemoryAccessToken: string | null = null;
let inMemoryAuthUser: unknown = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

function readStorageValue(key: string): string | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageValue(key: string, value: string) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage failures and continue with in-memory auth state.
  }
}

function removeStorageValue(key: string) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures and continue clearing in-memory auth state.
  }
}

export function getAccessToken(): string | null {
  if (!inMemoryAccessToken) {
    inMemoryAccessToken = readStorageValue(ACCESS_TOKEN_KEY);
  }

  return inMemoryAccessToken;
}

export function persistAuthSession(session: { accessToken: string; user: unknown }) {
  inMemoryAccessToken = session.accessToken;
  inMemoryAuthUser = session.user;
  writeStorageValue(ACCESS_TOKEN_KEY, session.accessToken);
  writeStorageValue(AUTH_USER_KEY, JSON.stringify(session.user));
}

export function clearAuthSession() {
  inMemoryAccessToken = null;
  inMemoryAuthUser = null;
  removeStorageValue(ACCESS_TOKEN_KEY);
  removeStorageValue(AUTH_USER_KEY);
}

export function getStoredAuthUser<T>(): T | null {
  if (!inMemoryAuthUser) {
    const rawValue = readStorageValue(AUTH_USER_KEY);

    if (rawValue) {
      try {
        inMemoryAuthUser = JSON.parse(rawValue);
      } catch {
        removeStorageValue(AUTH_USER_KEY);
      }
    }
  }

  return (inMemoryAuthUser as T | null) ?? null;
}
