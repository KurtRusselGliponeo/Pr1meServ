'use client';

import { LoginForm, useAuth } from '@/features/identity';

function BrandShield({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div className={className}>
      <svg viewBox="0 0 56 56" className={iconClassName} aria-hidden="true">
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

const stats = [
  { value: '225', label: 'Active Agents' },
  { value: '480+', label: 'Policies' },
  { value: '602', label: 'NAP Records' },
] as const;

export default function LoginPage() {
  const { isRestoringSession } = useAuth();

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="grid min-h-screen md:grid-cols-[44fr_56fr]">
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-10 sm:px-10 lg:px-14">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-surface" />
            <div className="absolute -top-12 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-[400px]">
            <div className="mb-10">
              <div className="flex items-center gap-3">
                <BrandShield
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft"
                  iconClassName="h-5 w-5"
                />
                <div>
                  <p className="text-lg font-semibold text-foreground">Pr1meServ</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    PRU Life UK | A1 Prime Branch
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-4xl font-semibold leading-tight text-foreground">
                Nice to see you again
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                PRU Life UK | A1 Prime Branch
              </p>
            </div>

            {isRestoringSession ? (
              <div className="mb-6 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground shadow-soft">
                Connecting to server, please wait...
              </div>
            ) : null}

            <LoginForm />
          </div>
        </section>

        <section className="relative hidden overflow-hidden bg-surface md:flex md:min-h-screen md:w-full md:items-center md:justify-center md:px-14 lg:px-20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-primary" />
            <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-background/20 blur-3xl" />
            <div className="absolute right-6 top-14 h-64 w-64 rounded-full bg-accent/50 blur-3xl" />
            <div className="absolute bottom-12 right-20 h-96 w-96 rounded-full bg-hero-orb-3/30 blur-3xl" />
          </div>

          <div className="relative z-10 flex w-full max-w-[580px] flex-col items-center text-center text-primary-foreground">
            <BrandShield
              className="mb-10 flex h-20 w-20 items-center justify-center rounded-[22px] bg-background/15 text-primary-foreground backdrop-blur-sm"
              iconClassName="h-10 w-10"
            />

            <h1 className="w-full text-4xl font-semibold leading-tight text-primary-foreground">
              Let&apos;s make every day <span className="text-background">meaningful</span> together.
            </h1>

            <div className="my-8 h-px w-12 bg-primary-foreground/30" />

            <p className="max-w-[420px] text-base leading-7 text-primary-foreground/75">
              Empowering the A1 Prime Branch with smarter tools for agent management,
              client care, and branch growth.
            </p>

            <div className="mt-12 grid w-full gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-primary-foreground/15 bg-background/10 px-4 py-6 backdrop-blur-sm"
                >
                  <p className="text-3xl font-semibold text-primary-foreground">{stat.value}</p>
                  <p className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-primary-foreground/65">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-16 text-[11px] text-primary-foreground/45">
              (c) 2025 PRU Life UK | A1 Prime Branch | Internal Use Only
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
