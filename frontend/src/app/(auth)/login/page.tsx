'use client';

import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/identity";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md border-white/20 bg-white/95 backdrop-blur-xl">
      <CardHeader className="space-y-4 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">
              A1 Prime
            </p>
            <CardTitle>Welcome back</CardTitle>
          </div>
        </div>
        <CardDescription>
          Sign in to access PRU Life UK branch management, performance monitoring, and protected dashboard data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <LoginForm />
        <div className="rounded-2xl bg-muted/70 px-4 py-3 text-sm text-muted-foreground">
          Use your assigned company credentials to continue to the dashboard.
        </div>
      </CardContent>
    </Card>
  );
}
