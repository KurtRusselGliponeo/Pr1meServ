'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { KeyRound, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { DataTable, ServerPaginationControls } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import api from '@/services/api-client';
import { useCreateUser } from '../hooks/use-create-user';
import { useGetUsers } from '../hooks/use-get-users';
import { useResetUserPassword } from '../hooks/use-reset-user-password';
import { useRestoreUser } from '../hooks/use-restore-user';
import { useUpdateUser } from '../hooks/use-update-user';
import type { ManagedUser } from '../types/user-management.types';
import { UserEditDialog } from './user-edit-dialog';
import { UserCreationForm } from './user-creation-form';

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export function UsersPageClient() {
  const [page, setPage] = React.useState(1);
  const queryClient = useQueryClient();
  const usersQuery = useGetUsers(page);
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const restoreUserMutation = useRestoreUser();
  const resetUserPasswordMutation = useResetUserPassword();
  const softDeleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/users/${userId}`);
    },
    onSuccess: () => {
      toast.success('User account archived.');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const columns = React.useMemo<Array<ColumnDef<ManagedUser>>>(
    () => [
      {
        id: 'name',
        header: 'User',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">
              {row.original.firstName} {row.original.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Role',
      },
      {
        accessorKey: 'createdAtUtc',
        header: 'Created',
        cell: ({ row }) => formatDate(row.original.createdAtUtc),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (row.original.deletedAtUtc ? 'Archived' : 'Active'),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="flex flex-wrap gap-2">
              <UserEditDialog
                user={user}
                isPending={updateUserMutation.isPending}
                onSubmit={async (payload) => {
                  await updateUserMutation.mutateAsync({ userId: user.id, payload });
                }}
              />
              {user.deletedAtUtc ? (
                <ConfirmActionDialog
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-9 rounded-full"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore
                    </Button>
                  }
                  title="Restore user account"
                  description={`This will reactivate ${user.firstName} ${user.lastName}.`}
                  confirmLabel="Restore user"
                  onConfirm={async () => {
                    await restoreUserMutation.mutateAsync(user.id);
                  }}
                  isPending={restoreUserMutation.isPending}
                />
              ) : (
                <>
                  <ConfirmActionDialog
                    trigger={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-9 rounded-full"
                      >
                        <KeyRound className="h-4 w-4" />
                        Reset password
                      </Button>
                    }
                    title="Reset user password"
                    description={`This will generate a temporary password for ${user.firstName} ${user.lastName} and queue an email delivery.`}
                    confirmLabel="Reset password"
                    onConfirm={async () => {
                      await resetUserPasswordMutation.mutateAsync(user.id);
                    }}
                    isPending={resetUserPasswordMutation.isPending}
                  />
                  <ConfirmActionDialog
                    trigger={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-9 rounded-full"
                      >
                        <Trash2 className="h-4 w-4" />
                        Archive
                      </Button>
                    }
                    title="Archive user account"
                    description={`This will soft-delete ${user.firstName} ${user.lastName} and preserve their audit history.`}
                    confirmLabel="Archive user"
                    onConfirm={async () => {
                      await softDeleteMutation.mutateAsync(user.id);
                    }}
                    isPending={softDeleteMutation.isPending}
                  />
                </>
              )}
            </div>
          );
        },
      },
    ],
    [resetUserPasswordMutation, restoreUserMutation, softDeleteMutation, updateUserMutation],
  );

  if (usersQuery.isPending && !usersQuery.data) {
    return <LoadingSkeleton rows={6} columns={4} />;
  }

  if (!usersQuery.data || usersQuery.errorMessage) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="User management is unavailable"
        description={usersQuery.errorMessage ?? 'User records could not be loaded.'}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          User management
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Create branch accounts, review current access, edit user details, reset passwords, and
          archive or restore users while preserving the audit trail.
        </p>
        {usersQuery.isFetching ? (
          <p className="mt-3 text-sm text-muted-foreground">Refreshing user records...</p>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <UserCreationForm
          isPending={createUserMutation.isPending}
          onSubmit={async (payload) => {
            await createUserMutation.mutateAsync(payload);
          }}
        />
        <div className="space-y-4">
          <DataTable columns={columns} data={usersQuery.data.data} />
          <ServerPaginationControls
            page={usersQuery.data.meta.page}
            pageSize={usersQuery.data.meta.pageSize}
            total={usersQuery.data.meta.total}
            hasNextPage={usersQuery.data.meta.hasNextPage}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}

