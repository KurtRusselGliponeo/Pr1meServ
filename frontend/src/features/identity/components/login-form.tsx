'use client';

import * as React from 'react';
import Link from 'next/link';
import axios from 'axios';
import { AlertCircle, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '../context/auth-context';
import { loginSchema, type LoginFormValues } from '../lib/login-schema';
import { zodResolver } from '../lib/zod-resolver';

// Shared inline style for both inputs.
// The giant inset box-shadow is the only reliable cross-browser way to override
// the browser's yellow autofill background — background-color alone is ignored
// by Chrome/Edge once autofill kicks in.
const darkInputStyle: React.CSSProperties = {
  height: '48px',
  borderRadius: '14px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.08)',
  fontSize: '14px',
  color: '#ffffff',
  // Paints a dark fill OVER the browser autofill yellow highlight.
  // boxShadow alone is enough — do NOT add WebkitTextFillColor here because
  // it breaks icon visibility while typing and hides autofill suggestions.
  WebkitBoxShadow: '0 0 0 1000px #111111 inset',
  boxShadow: '0 0 0 1000px #111111 inset',
  caretColor: '#ffffff',
  // Delays autofill transition so yellow flash never appears
  transition: 'background-color 9999s ease-in-out 0s',
};

export function LoginForm() {
  const { login } = useAuth();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema as never),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null);

    try {
      await login(values);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        setSubmitError(message ?? 'Unable to sign in. Please check your credentials.');
        return;
      }

      setSubmitError('Unable to sign in right now. Please try again.');
    }
  }

  return (
    <div className={submitError ? 'animate-auth-shake' : undefined}>
      <Form {...form}>
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>

          {/* ── Email ── */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-2.5">
                <FormLabel
                  className="text-[12px] font-medium uppercase tracking-[0.14em]"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  Email address
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2"
                      style={{ color: 'rgba(255,255,255,0.45)' }}
                    />
                    <Input
                      autoComplete="email"
                      placeholder="agent@a1prime.com"
                      style={{ ...darkInputStyle, paddingLeft: '44px', paddingRight: '16px' }}
                      className="focus-visible:ring-0 focus-visible:translate-y-0 [&::placeholder]:text-white/40"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-sm" style={{ color: '#e8c8a0' }} />
              </FormItem>
            )}
          />

          {/* ── Password ── */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-2.5">
                <FormLabel
                  className="text-[12px] font-medium uppercase tracking-[0.14em]"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2"
                      style={{ color: 'rgba(255,255,255,0.45)' }}
                    />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      style={{ ...darkInputStyle, paddingLeft: '44px', paddingRight: '44px' }}
                      className="focus-visible:ring-0 focus-visible:translate-y-0 [&::placeholder]:text-white/40"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-none"
                      style={{ color: 'rgba(255,255,255,0.45)' }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="size-[18px]" aria-hidden="true" />
                      ) : (
                        <Eye className="size-[18px]" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-sm" style={{ color: '#e8c8a0' }} />
              </FormItem>
            )}
          />

          {/* ── Remember Me + Forgot Password ── */}
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between gap-4 space-y-0">
                <label
                  className="flex items-center gap-2.5 text-[13px]"
                  style={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(field.value)}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#c9b99a]"
                  />
                  <span>Remember Me</span>
                </label>
                <Link
                  href="#"
                  className="text-[13px] font-medium underline-offset-4 transition-colors hover:underline focus-visible:outline-none"
                  style={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  Forgot Password?
                </Link>
              </FormItem>
            )}
          />

          {/* ── Error ── */}
          {submitError ? (
            <div
              className="flex items-start gap-3 rounded-[14px] px-4 py-3 text-sm"
              style={{
                border: '1px solid rgba(232,200,160,0.3)',
                background: 'rgba(232,200,160,0.1)',
                color: '#e8c8a0',
              }}
            >
              <AlertCircle className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          ) : null}

          {/* ── Sign In — half width, centered ── */}
          <div className="flex justify-center pt-1">
            <Button
              type="submit"
              size="lg"
              className="h-[46px] w-1/2 rounded-full text-[15px] font-semibold tracking-[0.06em] shadow-none transition-opacity disabled:opacity-70"
              style={{ background: '#c9b99a', color: '#1a1610' }}
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <LoaderCircle className="size-5 animate-spin" style={{ color: '#1a1610' }} />
              ) : (
                'Sign In'
              )}
            </Button>
          </div>

          {/* ── Sign Up — commented out, not yet confirmed if in scope ── */}
          {/*
          <p className="text-center text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Don&apos;t have an account?{' '}
            <Link href="#" className="underline-offset-4 transition-colors hover:underline"
              style={{ color: 'rgba(255,255,255,0.65)' }}>
              Sign Up
            </Link>
          </p>
          */}

        </form>
      </Form>
    </div>
  );
}