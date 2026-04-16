import { FileUp } from 'lucide-react';

import { ClientProfileImportForm } from '@/features/cosaf/components/client-profile-import-form';
import { RoleGuard } from '@/features/identity';

export default function CosafImportPage() {
  return (
    <RoleGuard allowedRoles={['Admin', 'BranchManager']}>
      <div className="space-y-6">
        <section className="floating-card bg-white/72 p-6 sm:p-8 dark:bg-card/82">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand/75">
                COSAF Import
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                Import client profiles
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Upload a validated branch import file for client profile processing. The form
                includes immediate validation, clear recovery feedback, and a focused handoff into
                the backend import queue.
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-gradient text-brand-foreground shadow-soft">
              <FileUp className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="floating-card p-6 sm:p-8">
          <ClientProfileImportForm />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="floating-card p-6">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Before uploading
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Confirm the selected file is the exact document that should enter protected import
              processing.
            </p>
          </div>
          <div className="floating-card p-6">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Processing expectation
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Successful uploads return an acknowledged file reference immediately. Downstream
              parsing and row-level handling continue in the protected backend workflow.
            </p>
          </div>
        </section>
      </div>
    </RoleGuard>
  );
}
