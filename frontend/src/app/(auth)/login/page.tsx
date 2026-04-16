'use client';

import { ArrowRight, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/features/identity';

export default function LoginPage() {
  return (
    <div className="grid w-full max-w-6xl gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="floating-card hidden min-h-[620px] overflow-hidden bg-white/72 p-8 xl:flex xl:flex-col xl:justify-between dark:bg-card/82">
        <div>
          <div className="inline-flex items-center gap-3 rounded-full border border-white/55 bg-background/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-brand/80 shadow-soft dark:border-white/10 dark:bg-white/5">
            <Sparkles className="size-4" />
            PRU Life UK
          </div>
          <h1 className="mt-8 max-w-xl text-5xl font-semibold tracking-tight text-foreground">
            A cleaner command surface for branch operations.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
            Sign in to review client movements, monitor performance, and manage the branch workspace
            from one polished system.
          </p>
        </div>

        <div className="grid gap-4">
          {[
            {
              icon: ShieldCheck,
              title: 'Protected access',
              text: 'Role-aware routes and session recovery keep the workspace secure.',
            },
            {
              icon: Workflow,
              title: 'Operational workflows',
              text: 'Move between COSAF, metrics, and administration without losing context.',
            },
            {
              icon: ArrowRight,
              title: 'Built for clarity',
              text: 'Intentional spacing, softer depth, and calmer visual hierarchy reduce friction.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[30px] border border-white/55 bg-background/88 p-5 shadow-soft dark:border-white/10 dark:bg-white/[0.04]"
            >
              <div className="flex items-start gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-soft">
                  <item.icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Card className="w-full border-white/50 bg-white/82 backdrop-blur-xl dark:border-white/10 dark:bg-card/84">
        <CardHeader className="space-y-5 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-3xl bg-brand text-brand-foreground shadow-float">
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
            Sign in to access branch management, performance monitoring, and protected dashboard
            data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LoginForm />
          <div className="rounded-3xl border border-white/50 bg-brand-gradient-soft px-4 py-4 text-sm leading-6 text-muted-foreground dark:border-white/10">
            Use your assigned company credentials to continue to the workspace.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
