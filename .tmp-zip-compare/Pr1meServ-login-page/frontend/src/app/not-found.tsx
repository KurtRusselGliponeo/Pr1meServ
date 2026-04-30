import Link from 'next/link';
import { Compass } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full">
        <EmptyState
          icon={Compass}
          title="Page not found"
          description="The page you requested does not exist or may have moved to a different workspace area."
        />
        <div className="mt-6 flex justify-center">
          <Button asChild className="min-h-11 rounded-2xl px-5">
            <Link href="/dashboard">Return to dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
