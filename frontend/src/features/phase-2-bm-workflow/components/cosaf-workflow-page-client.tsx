'use client';

import { ArrowRightLeft, FileCheck2, Users } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/features/identity/context/auth-context';
import { CosafApprovalsPanel } from './cosaf-approvals-panel';
import { CosafPageClient } from './cosaf-page-client';
import { CosafUploadPanel } from './cosaf-upload-panel';

interface CosafWorkflowPageClientProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export function CosafWorkflowPageClient({ searchParams }: CosafWorkflowPageClientProps) {
  const { user, isHydrated } = useAuth();

  if (!isHydrated || !user) {
    return null;
  }

  const isAdmin = user.role === 'Admin';
  const isManager = user.role === 'BranchManager';
  const isAgent = user.role === 'Agent';

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 fade-in">
      {isAdmin ? (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
                Orphan Client Automation
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                Admin reassignment command center
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Move clients into the orphan queue, reassign them to a new agent, and monitor
                downstream COSAF progress without bouncing through group chats.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="floating-card p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-brand-gradient-soft p-3 text-brand">
                    <ArrowRightLeft className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Batch reassignment</p>
                    <p className="text-sm text-muted-foreground">
                      Send selected clients to an agent or park them as orphans.
                    </p>
                  </div>
                </div>
              </div>
              <div className="floating-card p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-brand-gradient-soft p-3 text-brand">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Pipeline visibility</p>
                    <p className="text-sm text-muted-foreground">
                      Watch uploads and approvals move through the digital handoff.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="floating-card rounded-[32px] border border-dashed border-brand/25 bg-brand-gradient-soft p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold text-foreground">Need to move ownership now?</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Use the reassignment workspace to assign orphaned clients before agents begin the
                  document handoff.
                </p>
              </div>
              <a
                href="/dashboard/cosaf/reassign"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground shadow-soft transition hover:-translate-y-0.5 hover:shadow-float"
              >
                Open reassignment screen
              </a>
            </div>
          </section>

          <section>
            <CosafPageClient searchParams={searchParams} />
          </section>
        </>
      ) : null}

      {isAgent ? (
        <>
          <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
              COSAF Portal
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Agent upload portal
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Pick your reassigned client, upload the signed COSAF, and push the case straight into
              the manager approval queue.
            </p>
          </section>
          <CosafUploadPanel />
          <section>
            <CosafPageClient searchParams={searchParams} />
          </section>
        </>
      ) : null}

      {isManager ? (
        <>
          <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
              Approval Queue
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Manager COSAF approvals
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Review each submission, approve clean cases, or return incomplete packets with a
              mandatory reason for the agent.
            </p>
          </section>
          <CosafApprovalsPanel />
          <section>
            <CosafPageClient searchParams={searchParams} />
          </section>
        </>
      ) : null}

      {!isAdmin && !isManager && !isAgent ? (
        <EmptyState
          icon={Users}
          title="COSAF workflow is unavailable"
          description="Your account does not have access to this workflow."
        />
      ) : null}
    </div>
  );
}
