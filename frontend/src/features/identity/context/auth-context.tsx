'use client';

import * as React from 'react';
import { startTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import {
  clearAuthSession,
  getAccessToken,
  getStoredAuthUser,
  persistAuthSession,
} from '@/lib/auth';
import {
  getCurrentUser,
  login as loginRequest,
  logoutRequest,
  refreshAccessToken,
  resetPassword as resetPasswordRequest,
} from '../services/auth.service';
import type { LoginFormValues } from '../lib/login-schema';
import type { AuthenticatedUser } from '../types/auth.types';

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isRestoringSession: boolean;
  login: (values: LoginFormValues) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  resetPassword: (password: string, confirmPassword: string) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = React.useState<AuthenticatedUser | null>(null);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isRestoringSession, setIsRestoringSession] = React.useState(false);

  const refreshUser = React.useCallback(async () => {
    try {
      setIsRestoringSession(true);

      if (!getAccessToken()) {
        const nextAccessToken = await refreshAccessToken();
        const storedUser = getStoredAuthUser<AuthenticatedUser>();

        if (storedUser) {
          persistAuthSession({
            accessToken: nextAccessToken,
            user: storedUser,
          });
        }
      }

      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch {
      clearAuthSession();
      setUser(null);
    } finally {
      setIsRestoringSession(false);
      setIsHydrated(true);
    }
  }, []);

  React.useEffect(() => {
    setUser(getStoredAuthUser<AuthenticatedUser>());
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!isHydrated || user) {
      return;
    }

    void refreshUser();
  }, [isHydrated, refreshUser, user]);

  const login = React.useCallback(
    async (values: LoginFormValues) => {
      const session = await loginRequest(values);

      persistAuthSession({
        accessToken: session.tokens.accessToken,
        user: session.user,
      });

      setUser(session.user);
      startTransition(() => {
        router.replace('/dashboard');
      });
    },
    [router],
  );

  const logout = React.useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearAuthSession();
      setUser(null);
      startTransition(() => {
        router.replace('/login');
      });
    }
  }, [pathname, router]);

  const resetPassword = React.useCallback(
    async (password: string, confirmPassword: string) => {
      const currentUser = await resetPasswordRequest({ password, confirmPassword });

      persistAuthSession({
        accessToken: getAccessToken() ?? '',
        user: currentUser,
      });

      setUser(currentUser);
      startTransition(() => {
        router.replace('/dashboard');
      });
    },
    [router],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user && getAccessToken()),
        isHydrated,
        isRestoringSession,
        login,
        logout,
        refreshUser,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
