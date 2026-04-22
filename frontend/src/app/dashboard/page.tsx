import { LapsationAlertWidget } from '@/features/phase-5-performance/components/lapsation-alert-widget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, AlertTriangle, ArrowRight, ShieldCheck, Trophy, Users } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const quickStats = [
    {
      title: 'Orphan Clients',
      value: '24',
      description: 'Pending reassignment',
      icon: Users,
      trend: '+4 since yesterday',
      trendUp: false,
    },
    {
      title: 'At-Risk Policies',
      value: '7',
      description: 'Expiring in < 30 days',
      icon: AlertTriangle,
      trend: '-2 since yesterday',
      trendUp: true,
    },
    {
      title: 'Branch Ranking',
      value: '#4',
      description: 'Regional performance',
      icon: Trophy,
      trend: 'Up 1 spot this week',
      trendUp: true,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here is what's happening in your branch today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/documents">
            <Button variant="outline" className="rounded-full">
              View Documents
            </Button>
          </Link>
          <Link href="/dashboard/cosaf">
            <Button className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
              Start Reassignment <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Quick Stats Grid */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {quickStats.map((stat) => (
          <Card key={stat.title} className="group relative overflow-hidden rounded-3xl border-border/50 bg-background/50 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:bg-white/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
              <div className="mt-4 flex items-center text-xs">
                <span
                  className={
                    stat.trendUp ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'font-medium text-destructive'
                  }
                >
                  {stat.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Lapsation Alert Widget */}
      <LapsationAlertWidget />

      {/* Two Column Layout for Workflows */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border-border/50 bg-background/50 shadow-sm backdrop-blur-sm dark:bg-white/5">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest system actions and updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              { text: 'Assigned 4 clients to Agent Michael Scott', time: '2 hours ago', icon: ShieldCheck },
              { text: 'Imported new COSAF data batch', time: '5 hours ago', icon: Activity },
              { text: 'Rescued 1 policy from lapsation', time: '1 day ago', icon: AlertTriangle },
            ].map((activity, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <activity.icon className="h-4 w-4" />
                </div>
                <div className="grid gap-1">
                  <p className="text-sm font-medium leading-none text-foreground">{activity.text}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/50 bg-background/50 shadow-sm backdrop-blur-sm dark:bg-white/5">
          <CardHeader>
            <CardTitle>Quick Navigation</CardTitle>
            <CardDescription>Jump directly to your operational workspaces.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Link href="/dashboard/cosaf">
              <div className="group flex cursor-pointer flex-col justify-center rounded-2xl border border-border/50 bg-background p-6 transition-colors hover:border-primary/50 hover:bg-accent">
                <Users className="mb-3 h-6 w-6 text-primary transition-transform group-hover:scale-110" />
                <span className="font-medium text-foreground">Reassignments</span>
              </div>
            </Link>
            <Link href="/dashboard/performance">
              <div className="group flex cursor-pointer flex-col justify-center rounded-2xl border border-border/50 bg-background p-6 transition-colors hover:border-primary/50 hover:bg-accent">
                <Trophy className="mb-3 h-6 w-6 text-primary transition-transform group-hover:scale-110" />
                <span className="font-medium text-foreground">Leaderboard</span>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
