'use client';

import Image from 'next/image';

import { LoginForm, useAuth } from '@/features/identity';

function BrandShield() {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
      <svg viewBox="0 0 56 56" className="h-6 w-6" aria-hidden="true">
        <path
          d="M28 12.5L39 16.9V26.7C39 34.2 34.3 40.7 28 43.2C21.7 40.7 17 34.2 17 26.7V16.9L28 12.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M23.3 28.2L26.8 31.7L33.7 24.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const { isRestoringSession } = useAuth();

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="grid min-h-screen md:grid-cols-2">
        <section className="flex min-h-screen items-center justify-center bg-background px-6 py-8 sm:px-10 md:px-12 lg:px-16">
          <div className="w-full max-w-[408px]">
            <div className="mb-14 flex items-center gap-3">
              <BrandShield />
              <div>
                <p className="text-[1.1rem] font-semibold tracking-tight text-foreground">
                  Pr1meServ
                </p>
                <p className="text-[0.95rem] text-muted-foreground">
                  PRU Life UK | A1 Prime Branch
                </p>
              </div>
            </div>

            <div className="mb-10 space-y-3.5">
              <p className="text-[0.95rem] font-medium text-muted-foreground">Welcome back</p>
              <h1 className="text-[2.55rem] font-semibold tracking-[-0.03em] text-foreground sm:text-[2.8rem]">
                Sign in to your account
              </h1>
              <p className="max-w-sm text-[0.98rem] leading-7 text-muted-foreground">
                Access your branch management workspace and continue where you left off.
              </p>
            </div>

            {isRestoringSession ? (
              <div className="mb-7 rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm text-muted-foreground">
                Connecting to server, please wait...
              </div>
            ) : null}

            <LoginForm />
          </div>
        </section>

        <section className="relative hidden min-h-screen overflow-hidden bg-surface md:block">
          <Image
            src="/images/login-hero.webp"
            alt="A1 Prime login hero illustration"
            fill
            priority
            className="object-cover"
          />
        </section>
      </div>
    </div>
  );
}
