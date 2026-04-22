'use client';

import { DM_Sans, Playfair_Display } from 'next/font/google';

import { LoginForm, useAuth } from '@/features/identity';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-login-display',
  weight: ['500', '600'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-login-sans',
  weight: ['400', '500'],
});

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
    <div
      className={`${playfair.variable} ${dmSans.variable} min-h-screen bg-[#443b20]`}
      style={{ fontFamily: 'var(--font-login-sans)' }}
    >
      <div className="grid min-h-screen md:grid-cols-[44fr_56fr]">

        {/* ── LEFT: Login Form Panel — dark background ── */}
        <section className="relative flex min-h-screen items-center justify-center bg-[#0f0f0f] px-6 py-10 sm:px-10 lg:px-14">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-10 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#443b20] opacity-15 blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-[400px]">

            {/* Logo */}
            <div className="mb-10">
              <div className="flex items-center gap-3">
                <BrandShield
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-[#c9b99a] text-[#1a1610]"
                  iconClassName="h-[21px] w-[21px]"
                />
                <div>
                  {/* "Pr1meServ" — same size as right panel heading feel, kept proportional */}
                  <p
                    className="font-semibold text-white"
                    style={{ fontSize: '19px', fontFamily: 'var(--font-login-display)' }}
                  >
                    Pr1meServ
                  </p>
                  <p style={{ marginTop: '2px', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                    PRU Life UK | A1 Prime Branch
                  </p>
                </div>
              </div>
            </div>

            {/* Heading — matching right panel at 38px */}
            <div className="mb-8">
              <p
                className="font-medium text-white"
                style={{ fontSize: '38px', lineHeight: '1.2', fontFamily: 'var(--font-login-display)' }}
              >
                Nice to see you again
              </p>
              <p style={{ marginTop: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
                PRU Life UK | A1 Prime Branch
              </p>
            </div>

            {/* Session restore banner */}
            {isRestoringSession ? (
              <div
                className="mb-6 rounded-[14px] px-4 py-3 text-[13px]"
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                Connecting to server, please wait...
              </div>
            ) : null}

            {/* Form */}
            <LoginForm />
          </div>
        </section>

        {/* ── RIGHT: Hero Panel ── */}
        <section className="relative hidden overflow-hidden bg-[#443b20] md:flex md:min-h-screen md:w-full md:items-center md:justify-center md:px-14 lg:px-20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-[#5c4f2a] opacity-50 blur-3xl" />
            <div className="absolute right-6 top-14 h-64 w-64 rounded-full bg-[#6b5c2e] opacity-50 blur-3xl" />
            <div className="absolute bottom-12 right-20 h-96 w-96 rounded-full bg-[#5c4f2a] opacity-40 blur-3xl" />
          </div>

          <div className="relative z-10 flex w-full max-w-[580px] flex-col items-center text-center text-white">
            <BrandShield
              className="mb-10 flex h-20 w-20 items-center justify-center rounded-[22px] bg-white/10 text-white"
              iconClassName="h-10 w-10"
            />

            {/* Heading — 38px, same as left panel */}
            <h1
              className="w-full font-medium text-white"
              style={{ fontSize: '38px', lineHeight: '1.2', fontFamily: 'var(--font-login-display)' }}
            >
              Let&apos;s make every day{' '}
              <span className="italic" style={{ color: '#e8d8a8' }}>Meaningful</span> together.
            </h1>

            <div className="my-8 h-[1.5px] w-12 bg-white/25" />

            <p
              className="w-full"
              style={{ maxWidth: '420px', fontSize: '16px', lineHeight: '1.75', color: 'rgba(255,255,255,0.6)' }}
            >
              Empowering the A1 Prime Branch with smarter tools
              for agent management, client care, and branch growth.
            </p>

            {/* Stats */}
            <div className="mt-12 grid w-full gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl backdrop-blur-sm"
                  style={{
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.08)',
                    padding: '24px 16px',
                  }}
                >
                  <p
                    className="font-medium text-white"
                    style={{ fontSize: '32px', fontFamily: 'var(--font-login-display)' }}
                  >
                    {stat.value}
                  </p>
                  <p
                    className="uppercase"
                    style={{ marginTop: '6px', fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)' }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <p style={{ marginTop: '64px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
              (c) 2025 PRU Life UK | / A1 Prime Branch | Internal Use Only
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}