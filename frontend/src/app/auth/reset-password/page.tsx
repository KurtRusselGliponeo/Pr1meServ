'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, LoaderCircle, LockKeyhole } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/identity/context/auth-context';
import { completePasswordReset as completePasswordResetRequest } from '@/features/identity/services/auth.service';
import { zodResolver } from '@/features/identity/lib/zod-resolver';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(128, 'Password is too long.')
      .regex(/[a-z]/, 'Include at least one lowercase letter.')
      .regex(/[A-Z]/, 'Include at least one uppercase letter.')
      .regex(/[0-9]/, 'Include at least one number.')
      .regex(/[^A-Za-z0-9]/, 'Include at least one special character.'),
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const { resetPassword } = useAuth();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState<string | null>(null);
  const resetToken = searchParams.get('token');

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema as never),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: ResetPasswordValues) {
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      if (resetToken) {
        const response = await completePasswordResetRequest({
          token: resetToken,
          password: values.password,
          confirmPassword: values.confirmPassword,
        });
        setSubmitSuccess(response.message);
        form.reset();
        return;
      }

      await resetPassword(values.password, values.confirmPassword);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reset your password right now.';
      setSubmitError(message);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md border border-border/60">
        <CardHeader className="space-y-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LockKeyhole className="size-5" />
          </div>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            {resetToken
              ? 'Set a new password for your account using the reset link from your email.'
              : 'Your temporary password must be changed before you can continue to the dashboard.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormDescription>
                      Use 8+ characters with uppercase, lowercase, number, and special character.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {submitError ? (
                <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              ) : null}

              {submitSuccess ? (
                <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{submitSuccess}</span>
                </div>
              ) : null}

              <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <CheckCircle2 className="size-4 text-primary" />
                  Password requirements
                </div>
                <p className="mt-2">
                  At least 8 characters, including uppercase, lowercase, a number, and a symbol.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Updating password
                  </>
                ) : (
                  resetToken ? 'Reset password' : 'Continue to dashboard'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
