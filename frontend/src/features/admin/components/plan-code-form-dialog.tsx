'use client';

import * as React from 'react';
import { planCodeClassifications } from '@a1prime/schemas';

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
import type { PlanCodeFormValues, PlanCodeReference } from '@/features/admin/types/plan-code.types';
import { useSavePlanCode } from '@/features/admin/hooks/use-plan-codes';

interface PlanCodeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planCode?: PlanCodeReference | null;
}

const emptyForm: PlanCodeFormValues = {
  planCode: '',
  planName: '',
  productCategory: '',
  classification: 'OLUL',
  isActive: true,
  notes: null,
};

export function PlanCodeFormDialog({ open, onOpenChange, planCode }: PlanCodeFormDialogProps) {
  const [form, setForm] = React.useState<PlanCodeFormValues>(emptyForm);
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);
  const saveMutation = useSavePlanCode(planCode);

  React.useEffect(() => {
    if (!open) return;

    setValidationMessage(null);
    setForm(
      planCode
        ? {
            planCode: planCode.planCode,
            planName: planCode.planName,
            productCategory: planCode.productCategory,
            classification: planCode.classification,
            isActive: planCode.isActive,
            notes: planCode.notes,
          }
        : emptyForm,
    );
  }, [open, planCode]);

  function updateField<K extends keyof PlanCodeFormValues>(key: K, value: PlanCodeFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.planCode.trim() || !form.planName.trim() || !form.productCategory.trim()) {
      setValidationMessage('Plan code, plan name, and product category are required.');
      return;
    }

    await saveMutation.mutateAsync({
      ...form,
      planCode: form.planCode.trim().toUpperCase(),
      planName: form.planName.trim(),
      productCategory: form.productCategory.trim(),
      notes: form.notes?.trim() || null,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{planCode ? 'Edit plan code' : 'Add plan code'}</DialogTitle>
            <DialogDescription>
              Maintain the branch plan code reference used by manual policy entry and validation.
            </DialogDescription>
          </DialogHeader>

          {validationMessage && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {validationMessage}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">
              Plan code
              <Input
                value={form.planCode}
                onChange={(event) => updateField('planCode', event.target.value)}
                placeholder="PRU123"
                maxLength={50}
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Plan name
              <Input
                value={form.planName}
                onChange={(event) => updateField('planName', event.target.value)}
                placeholder="Plan display name"
                maxLength={255}
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Product category
              <Input
                value={form.productCategory}
                onChange={(event) => updateField('productCategory', event.target.value)}
                placeholder="Traditional, VUL, rider"
                maxLength={120}
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Classification
              <select
                className="flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.classification}
                onChange={(event) =>
                  updateField('classification', event.target.value as PlanCodeFormValues['classification'])
                }
              >
                {planCodeClassifications.map((classification) => (
                  <option key={classification} value={classification}>
                    {classification}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => updateField('isActive', event.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Active
          </label>

          <label className="space-y-1 text-sm font-medium">
            Notes
            <textarea
              value={form.notes ?? ''}
              onChange={(event) => updateField('notes', event.target.value || null)}
              maxLength={1000}
              className="min-h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Optional admin notes"
            />
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save plan code'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
