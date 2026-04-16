'use client';

import { z } from 'zod';
import { LoaderCircle, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { systemRoleSchema } from '@a1prime/schemas';

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

const createUserSchema = z.object({
  firstName: z.string().min(2, 'First name is required.'),
  lastName: z.string().min(2, 'Last name is required.'),
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  role: systemRoleSchema,
});
type CreateUserFormValues = z.infer<typeof createUserSchema>;

interface UserCreationFormProps {
  onSubmit: (payload: CreateUserPayload) => Promise<void>;
  isPending?: boolean;
}

export function UserCreationForm({ onSubmit, isPending = false }: UserCreationFormProps) {
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema as unknown as z.ZodType<CreateUserFormValues>),
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
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Create user</CardTitle>
            <CardDescription>Provision a new account and assign the correct system role.</CardDescription>
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
            <FormField control={form.control} name="firstName" render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="lastName" render={({ field }) => (
              <FormItem>
                <FormLabel>Last name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Email</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Temporary password</FormLabel>
                <FormControl><Input type="password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    value={String(field.value ?? 'Agent')}
                    className="min-h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="Admin">Admin</option>
                    <option value="BranchManager">Branch manager</option>
                    <option value="Agent">Agent</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="md:col-span-2">
              <Button type="submit" size="lg" className="min-h-11 rounded-2xl" disabled={isPending}>
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
