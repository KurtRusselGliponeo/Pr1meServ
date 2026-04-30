'use client';

import * as React from 'react';
import { ForgotPasswordRequestSchema, type ForgotPasswordRequest } from '@a1prime/schemas';
import { LoaderCircle, MailCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { forgotPassword } from '@/features/identity/services/auth.service';
import { zodResolver } from '@/features/identity/lib/zod-resolver';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(ForgotPasswordRequestSchema as never),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: ForgotPasswordRequest) {
    setSubmitError(null);

    try {
      await forgotPassword(values);
      setSubmitted(true);
    } catch {
      setSubmitError('Unable to process your request right now. Please try again.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MailCheck className="size-5" />
            </div>
            <div>
              <CardTitle>Forgot your password?</CardTitle>
              <CardDescription>We&apos;ll help you request a reset link.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground">
              If an account exists for that email, a reset link will be sent shortly.
            </div>
          ) : (
            <Form {...form}>
              <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-2.5">
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="email"
                          placeholder="agent@a1prime.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {submitError ? (
                  <div className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {submitError}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : (
                    'Request reset link'
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
