'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useSavePersistencyRecord } from '@/features/admin/hooks/use-persistency';
import type { PersistencyFormValues, PersistencyRecord } from '@/features/admin/types/persistency.types';
import { useGetAgents } from '@/features/phase-3-reassignment/hooks/use-get-agents';

interface PersistencyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: PersistencyRecord | null;
  defaultMonth: string;
}

const emptyForm: PersistencyFormValues = {
  agentId: '',
  recordMonth: '',
  branchCode: '',
  agentType: '',
  team: '',
  personalPersistency: 0,
  unitPersistency: 0,
  branchPersistency: 0,
  notes: null,
};

export function PersistencyFormDialog({
  open,
  onOpenChange,
  record,
  defaultMonth,
}: PersistencyFormDialogProps) {
  const [form, setForm] = React.useState<PersistencyFormValues>(emptyForm);
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);
  const agentsQuery = useGetAgents('', open);
  const saveMutation = useSavePersistencyRecord(record);
  const agents = agentsQuery.data?.data ?? [];

  React.useEffect(() => {
    if (!open) return;

    setValidationMessage(null);
    setForm(
      record
        ? {
            agentId: record.agentId,
            recordMonth: record.recordMonth,
            branchCode: record.branchCode ?? '',
            agentType: record.agentType ?? '',
            team: record.team ?? '',
            personalPersistency: record.personalPersistency,
            unitPersistency: record.unitPersistency,
            branchPersistency: record.branchPersistency,
            notes: record.notes,
          }
        : { ...emptyForm, recordMonth: defaultMonth },
    );
  }, [defaultMonth, open, record]);

  function updateField<K extends keyof PersistencyFormValues>(key: K, value: PersistencyFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.agentId || !form.recordMonth) {
      setValidationMessage('Agent and month are required.');
      return;
    }

    const rates = [form.personalPersistency, form.unitPersistency, form.branchPersistency];
    if (rates.some((rate) => Number.isNaN(rate) || rate < 0 || rate > 100)) {
      setValidationMessage('Persistency rates must be between 0 and 100.');
      return;
    }

    await saveMutation.mutateAsync({
      ...form,
      branchCode: form.branchCode?.trim() || undefined,
      agentType: form.agentType?.trim() || undefined,
      team: form.team?.trim() || undefined,
      notes: form.notes?.trim() || null,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>{record ? 'Edit persistency' : 'Add persistency'}</DialogTitle>
            <DialogDescription>Enter the monthly manual persistency record for one agent.</DialogDescription>
          </DialogHeader>

          {validationMessage && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {validationMessage}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">
              Month
              <Input
                type="month"
                value={form.recordMonth}
                onChange={(event) => updateField('recordMonth', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Agent
              <select
                value={form.agentId}
                onChange={(event) => updateField('agentId', event.target.value)}
                className="flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.displayName} ({agent.agentCode})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium">
              Branch
              <Input
                value={form.branchCode ?? ''}
                onChange={(event) => updateField('branchCode', event.target.value)}
                placeholder="Branch code"
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Agent type
              <Input
                value={form.agentType ?? ''}
                onChange={(event) => updateField('agentType', event.target.value)}
                placeholder="Agent type"
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Team
              <Input
                value={form.team ?? ''}
                onChange={(event) => updateField('team', event.target.value)}
                placeholder="Team"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {(['personalPersistency', 'unitPersistency', 'branchPersistency'] as const).map((field) => (
              <label key={field} className="space-y-1 text-sm font-medium">
                {field === 'personalPersistency'
                  ? 'Personal persistency'
                  : field === 'unitPersistency'
                    ? 'Unit persistency'
                    : 'Branch persistency'}
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form[field]}
                  onChange={(event) => updateField(field, Number(event.target.value))}
                />
              </label>
            ))}
          </div>

          <label className="space-y-1 text-sm font-medium">
            Notes
            <textarea
              value={form.notes ?? ''}
              onChange={(event) => updateField('notes', event.target.value || null)}
              className="min-h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Optional notes"
            />
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save persistency'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
