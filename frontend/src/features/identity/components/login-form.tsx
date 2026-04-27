'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { useWarmDashboardData } from '@/features/navigation/hooks/use-warm-dashboard-data';
import { useAuth } from '../context/auth-context';
import { loginSchema, type LoginFormValues } from '../lib/login-schema';
import { zodResolver } from '../lib/zod-resolver';

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { warmRoute } = useWarmDashboardData();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const dashboardPrefetchedRef = React.useRef(false);

  const warmDashboard = React.useCallback(() => {
    if (dashboardPrefetchedRef.current) {
      return;
    }

    dashboardPrefetchedRef.current = true;
    router.prefetch('/dashboard');
    warmRoute('/dashboard');
  }, [router, warmRoute]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema as never),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginFormValues) {
    warmDashboard();
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
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-2.5">
                <FormLabel className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Email address
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
                    <Input
                      autoComplete="email"
                      placeholder="agent@a1prime.com"
                      className="pl-11 pr-4"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-sm text-destructive" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-2.5">
                <FormLabel className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="pl-11 pr-12"
                      onFocus={warmDashboard}
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
                <FormMessage className="text-sm text-destructive" />
              </FormItem>
            )}
          />

          <FormItem className="flex flex-row items-center justify-between gap-4 space-y-0">
            <label className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-input text-primary accent-primary"
              />
              <span>Remember Me</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-[13px] font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none"
            >
              Forgot Password?
            </Link>
          </FormItem>

          {submitError ? (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          ) : null}

          <div className="flex justify-center pt-1">
            <Button
              type="submit"
              size="lg"
              className="h-[46px] w-1/2 rounded-full text-[15px] font-semibold tracking-[0.06em]"
              onMouseDown={warmDashboard}
              onFocus={warmDashboard}
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
