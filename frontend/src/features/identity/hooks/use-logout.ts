'use client';

import { useCallback } from 'react';

import { useAuth } from '@/features/identity';

export function useLogout() {
  const { logout } = useAuth();

  return useCallback(async () => {
    await logout();
  }, [logout]);
}
