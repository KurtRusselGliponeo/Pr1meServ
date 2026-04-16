import { Activity, ArrowRightLeft } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface AuditTrailTimelineItem {
  id: string;
  title: string;
  description: string;
  timestampUtc: string;
}

interface AuditTrailTimelineProps {
  items: AuditTrailTimelineItem[];
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AuditTrailTimeline({ items }: AuditTrailTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Audit trail timeline</CardTitle>
            <CardDescription>Recent reassignment events ready for branch review.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 rounded-3xl border border-border/70 bg-background/80 p-4">
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <ArrowRightLeft className="h-4 w-4" />
                </div>
                <div className="mt-2 h-full w-px bg-border" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  {formatTimestamp(item.timestampUtc)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
