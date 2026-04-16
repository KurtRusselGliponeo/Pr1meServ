'use client';

import { LoaderCircle, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { CreateUserSchema } from '@a1prime/schemas';

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
import { zodResolver } from '@/features/identity/lib/zod-resolver';
import type { CreateUserPayload } from '../types/user-management.types';
type CreateUserFormValues = CreateUserPayload;

interface UserCreationFormProps {
  onSubmit: (payload: CreateUserPayload) => Promise<void>;
  isPending?: boolean;
}

export function UserCreationForm({ onSubmit, isPending = false }: UserCreationFormProps) {
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(CreateUserSchema as never),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'Agent',
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-3xl bg-brand-gradient-soft p-3 text-brand">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Create user</CardTitle>
            <CardDescription>
              Provision a new account and assign the correct system role.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            className="grid gap-5 md:grid-cols-2"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values as CreateUserPayload);
            })}
          >
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={String(field.value ?? 'Agent')}
                      className="min-h-12 w-full rounded-2xl border border-white/55 bg-background/88 px-4 text-sm text-foreground shadow-soft outline-none transition-all duration-300 ease-smooth focus:border-brand focus:ring-4 focus:ring-brand/15 dark:border-white/10 dark:bg-white/5"
                    >
                      <option value="Admin">Admin</option>
                      <option value="BranchManager">Branch manager</option>
                      <option value="Agent">Agent</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-2">
              <Button
                type="submit"
                size="lg"
                className="min-h-12 rounded-full"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Creating
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
