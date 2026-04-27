'use client';

import Image from 'next/image';

import { LoginForm, useAuth } from '@/features/identity';

function BrandShield() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-400">
      <svg viewBox="0 0 56 56" className="h-5 w-5" aria-hidden="true">
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
    <div className="h-screen overflow-hidden bg-[#2dd4a0] font-sans text-foreground">
      <div className="relative flex h-screen">

        {/* SVG defs — clipPath for the dark panel's wavy right edge */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <clipPath id="dark-wave-clip" clipPathUnits="objectBoundingBox">
              {/*
               * ── WAVE SHAPE ────────────────────────────────────────────────
               * Coordinates are 0–1 (relative to the element's bounding box).
               * The right edge is an S-curve bezier.
               *   - Base X of boundary: the "0.88" values — move LEFT (smaller) or RIGHT (larger)
               *   - Wave depth (bulge): the "0.96" values — larger = more pronounced curve
               * ─────────────────────────────────────────────────────────────
               */}
              <path d="M0,0 L0.88,0 C0.96,0 0.96,0.25 0.88,0.5 C0.80,0.75 0.96,1 0.88,1 L0,1 Z" />
            </clipPath>
          </defs>
        </svg>

        {/* ─── Dark left panel clipped with wavy right edge ─── */}
        <section
          className="relative z-10 flex h-full w-full flex-col justify-center md:w-[58%]"
          style={{ clipPath: 'url(#dark-wave-clip)' }}
        >
          {/* Dark fill */}
          <div className="absolute inset-0 bg-[#1a1f2e]" />

          {/*
           * ── FORM HORIZONTAL POSITION ──────────────────────────────────────
           * `ml-auto`  keeps the block right-aligned within the dark panel.
           * `pr-[Xrem]` = distance from the wave edge. Increase to move LEFT, decrease to move RIGHT.
           * `max-w-[Xpx]` = how wide the form block is.
           * Current: pr-20 lg:pr-28  →  form sits comfortably left of the wave
           * ─────────────────────────────────────────────────────────────────
           */}
          <div className="relative ml-[20%] w-full max-w-[400px] pr-30 lg:pr-38">
            {/* Brand */}
            <div className="mb-10 flex items-center gap-3">
              <BrandShield />
              <div>
                <p className="text-[0.95rem] font-semibold text-white">Pr1meServ</p>
                <p className="text-[0.8rem] text-white/50">PRU Life UK | A1 Prime Branch</p>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-8 space-y-1">
              <h1 className="text-[2.1rem] font-bold leading-tight tracking-tight text-white">
                Welcome Back!
              </h1>
              <p className="text-[0.88rem] text-white/50">PRU Life UK | A1 Prime Branch</p>
            </div>

            {isRestoringSession ? (
              <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                Connecting to server, please wait...
              </div>
            ) : null}

            <LoginForm />
          </div>
        </section>

        {/* ─── Right panel — mint green with hero image ─── */}
        <section className="absolute inset-y-0 right-0 hidden md:block md:w-[48%]">
          <div className="absolute inset-0 bg-[#2dd4a0]">
            <Image
              src="/images/login-hero.webp"
              alt="A1 Prime login hero illustration"
              fill
              priority
              className="object-contain object-center"
            />
          </div>
          {/* Footer credit */}
          <p className="absolute bottom-4 left-0 right-0 z-20 text-center text-[0.72rem] text-emerald-900/60">
            (c) 2026 PRU Life UK | A1 Prime Branch | Internal Use Only
          </p>
        </section>

      </div>
    </div>
  );
}