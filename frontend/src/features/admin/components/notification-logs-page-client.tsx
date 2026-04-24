'use client';

import { BellRing } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useGetNotificationLogs } from '../hooks/use-get-notification-logs';
import type { NotificationLogsResponse } from '../types/notification-log.types';

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function NotificationLogsPageClient() {
  const logsQuery = useGetNotificationLogs();

  if (logsQuery.isPending) {
    return <LoadingSkeleton rows={6} columns={4} />;
  }

  if (!logsQuery.data || logsQuery.errorMessage) {
    return (
      <EmptyState
        icon={BellRing}
        title="Notification logs unavailable"
        description={logsQuery.errorMessage ?? 'Notification logs could not be loaded.'}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Notification logs
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Review email queue activity for reassignment, COSAF, and lapsation alerts.
        </p>
      </section>

      {logsQuery.data.data.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="No notifications recorded yet"
          description="Email activity will appear here after queue events are logged."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Recent email activity</CardTitle>
            <CardDescription>Queued, sent, and failed messages from the notification system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {logsQuery.data.data.map((item: NotificationLogsResponse['data'][number]) => (
              <div
                key={item.id}
                className="rounded-[24px] border border-white/40 bg-background/70 p-4 dark:border-white/10"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{item.subject}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.recipient}</p>
                  </div>
                  <span className="rounded-full bg-brand-gradient-soft px-3 py-1 text-xs font-semibold text-brand">
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{formatDate(item.createdAtUtc)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
