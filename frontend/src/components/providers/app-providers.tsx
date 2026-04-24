'use client';

import * as React from 'react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';

import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/features/identity';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            toast.error(getErrorMessage(error));
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            toast.error(getErrorMessage(error));
          },
        }),
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 10 * 60 * 1000,
            gcTime: 15 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            expand
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast:
                  'rounded-3xl border border-white/50 bg-card/95 shadow-float backdrop-blur-md dark:border-white/10',
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
