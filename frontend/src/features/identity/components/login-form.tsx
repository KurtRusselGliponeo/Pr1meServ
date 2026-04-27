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
        <form className="space-y-6.5" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-[0.95rem] font-medium text-foreground">
                  Email address
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      autoComplete="email"
                      placeholder="agent@a1prime.com"
                      className="h-[58px] rounded-2xl border-border bg-background pl-12 pr-4 text-[0.96rem] shadow-none placeholder:text-muted-foreground/80 focus-visible:translate-y-0 focus-visible:ring-2 focus-visible:ring-primary/20"
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
              <FormItem className="space-y-3">
                <FormLabel className="text-[0.95rem] font-medium text-foreground">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="h-[58px] rounded-2xl border-border bg-background pl-12 pr-12 text-[0.96rem] shadow-none placeholder:text-muted-foreground/80 focus-visible:translate-y-0 focus-visible:ring-2 focus-visible:ring-primary/20"
                      onFocus={warmDashboard}
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="size-5" aria-hidden="true" />
                      ) : (
                        <Eye className="size-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-sm text-destructive" />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between gap-4 pt-1">
            <label className="flex items-center gap-2.5 text-[0.93rem] text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span className="font-medium">Remember Me</span>
            </label>

            <Link
              href="/forgot-password"
              className="text-[0.93rem] font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Forgot Password?
            </Link>
          </div>

          {submitError ? (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="mt-1 h-[58px] w-full rounded-2xl text-[1rem] font-semibold shadow-none"
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
        </form>
      </Form>
    </div>
  );
}
