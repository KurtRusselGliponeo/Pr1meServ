'use client';

import * as React from 'react';
import axios from 'axios';
import { AlertCircle, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '../context/auth-context';
import { loginSchema, type LoginFormValues } from '../lib/login-schema';
import { zodResolver } from '../lib/zod-resolver';

export function LoginForm() {
  const { login } = useAuth();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema as never),
    defaultValues: { email: '', password: '' },
  });

  const emailValue = form.watch('email');
  const passwordValue = form.watch('password');

  React.useEffect(() => {
    if (!submitError) {
      return;
    }

    const hasAnyInput = emailValue.trim().length > 0 || passwordValue.trim().length > 0;

    if (hasAnyInput) {
      setSubmitError(null);
    }
  }, [emailValue, passwordValue, submitError]);

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null);
    try {
      await login(values);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        setSubmitError(message ?? 'Invalid email or password.');
        return;
      }
      setSubmitError('Unable to sign in right now. Please try again.');
    }
  }

  function onInvalidSubmit() {
    const email = form.getValues('email').trim();
    const password = form.getValues('password').trim();

    if (!email && !password) {
      setSubmitError('Invalid input: no input.');
      return;
    }

    setSubmitError('Invalid email or password.');
  }

  return (
    <div className={submitError ? 'animate-auth-shake' : undefined}>
      <Form {...form}>
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[0.75rem] font-semibold uppercase tracking-widest text-white/50">
                  Email Address
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-white/30" />
                    <Input
                      autoComplete="email"
                      placeholder="agent@a1prime.com"
                      className="h-14 rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-[0.93rem] text-white placeholder:text-white/25 focus-visible:border-emerald-400/40 focus-visible:ring-0"
                      {...field}
                    />
                  </div>
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[0.75rem] font-semibold uppercase tracking-widest text-white/50">
                  Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-white/30" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="h-14 rounded-2xl border border-white/10 bg-white/5 pl-11 pr-12 text-[0.93rem] text-white placeholder:text-white/25 focus-visible:border-emerald-400/40 focus-visible:ring-0"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-white/30 transition-colors hover:text-white/60"
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
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between gap-4 pt-0.5">
            <label className="flex cursor-pointer items-center gap-2.5 text-[0.88rem] text-white/50">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/10 accent-emerald-400"
              />
              <span>Remember Me</span>
            </label>

            <Link
              href="/forgot-password"
              className="text-[0.88rem] font-medium text-emerald-400 transition-colors hover:text-emerald-300"
            >
              Forgot Password?
            </Link>
          </div>

          {submitError ? (
            <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="mt-2 h-14 w-full rounded-2xl bg-emerald-400 text-[1rem] font-semibold text-emerald-950 shadow-none hover:bg-emerald-300 disabled:opacity-60"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
