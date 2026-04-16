'use client';

import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/features/identity';

export default function LoginPage() {
  return (
    <Card className="w-full max-w-lg border-white/50 bg-white/80 backdrop-blur-xl dark:bg-card/82 dark:border-white/10">
      <CardHeader className="space-y-5 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-3xl bg-brand-gradient text-brand-foreground shadow-float">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
              A1 Prime
            </p>
            <CardTitle>Welcome back</CardTitle>
          </div>
        </div>
        <CardDescription>
          Sign in to access PRU Life UK branch management, performance monitoring, and protected
          dashboard data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <LoginForm />
        <div className="rounded-3xl border border-white/50 bg-brand-gradient-soft px-4 py-4 text-sm leading-6 text-muted-foreground dark:border-white/10">
          Use your assigned company credentials to continue to the dashboard.
        </div>
      </CardContent>
    </Card>
  );
}
