'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <EmptyState
        icon={AlertTriangle}
        title="We hit an unexpected problem"
        description="The page could not be completed. Try loading it again. If the problem persists, contact an administrator."
        className="w-full"
      />
      <div className="sr-only" aria-live="assertive">
        {error.message}
      </div>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
        <Button type="button" className="min-h-11 rounded-2xl px-5" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
