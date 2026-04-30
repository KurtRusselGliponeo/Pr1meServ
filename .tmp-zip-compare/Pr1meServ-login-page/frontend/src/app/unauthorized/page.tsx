import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full">
        <EmptyState
          icon={ShieldAlert}
          title="You do not have access to this area"
          description="Your account does not include the required role for this page. If you believe this is a mistake, contact an administrator."
        />
        <div className="mt-6 flex justify-center">
          <Button asChild variant="outline" className="min-h-11 rounded-2xl px-5">
            <Link href="/dashboard">Go back to dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
