'use client';

import * as React from 'react';
import { Pencil } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { UpdateUserSchema } from '@a1prime/schemas';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import type { ManagedUser, UpdateUserPayload } from '../types/user-management.types';

interface UserEditDialogProps {
  user: ManagedUser;
  isPending?: boolean;
  onSubmit: (payload: UpdateUserPayload) => Promise<void>;
}

export function UserEditDialog({ user, isPending = false, onSubmit }: UserEditDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const form = useForm<UpdateUserPayload>({
    resolver: zodResolver(UpdateUserSchema as never),
    values: {
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        setIsOpen(nextOpen);
        if (nextOpen) {
          form.reset({
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          });
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="min-h-9 rounded-full">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update the person&apos;s name and role without changing their email address.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
              setIsOpen(false);
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
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={String(field.value)}
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
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending} className="min-h-11 rounded-full">
                Save changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
