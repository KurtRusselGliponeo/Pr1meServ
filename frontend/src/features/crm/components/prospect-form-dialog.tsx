'use client';

import * as React from 'react';
import {
  prospectPipelineStages,
  prospectTemperatures,
  type CreateProspect,
  type Prospect,
  type UpdateProspect,
} from '@a1prime/schemas';

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

interface ProspectFormDialogProps {
  open: boolean;
  agents: Array<{ value: string; label: string }>;
  canChooseAgent: boolean;
  initialProspect?: Prospect | null;
  isPending?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateProspect | UpdateProspect) => Promise<void>;
}

function toInputDateTimeValue(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function fromInputDateTimeValue(value: string) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

export function ProspectFormDialog({
  open,
  agents,
  canChooseAgent,
  initialProspect,
  isPending,
  onOpenChange,
  onSubmit,
}: ProspectFormDialogProps) {
  const isEditing = Boolean(initialProspect);
  const [agentCode, setAgentCode] = React.useState('');
  const [clientName, setClientName] = React.useState('');
  const [contactNumber, setContactNumber] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [temperature, setTemperature] = React.useState<(typeof prospectTemperatures)[number]>('Warm');
  const [pipelineStage, setPipelineStage] = React.useState<(typeof prospectPipelineStages)[number]>('Contacted');
  const [followUpDateUtc, setFollowUpDateUtc] = React.useState('');
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setAgentCode(initialProspect?.agentCode ?? agents[0]?.value ?? '');
    setClientName(initialProspect?.clientName ?? '');
    setContactNumber(initialProspect?.contactNumber ?? '');
    setEmail(initialProspect?.email ?? '');
    setTemperature(initialProspect?.temperature ?? 'Warm');
    setPipelineStage(initialProspect?.pipelineStage ?? 'Contacted');
    setFollowUpDateUtc(toInputDateTimeValue(initialProspect?.followUpDateUtc));
    setNotes(initialProspect?.notes ?? '');
  }, [agents, initialProspect, open]);

  async function handleSubmit() {
    const sharedPayload = {
      clientName,
      contactNumber,
      email: email.trim() ? email.trim() : null,
      temperature,
      pipelineStage,
      followUpDateUtc: fromInputDateTimeValue(followUpDateUtc),
      notes: notes.trim() ? notes.trim() : null,
    };

    if (isEditing) {
      await onSubmit(sharedPayload satisfies UpdateProspect);
      return;
    }

    await onSubmit({
      ...sharedPayload,
      agentCode: canChooseAgent ? agentCode : undefined,
    } satisfies CreateProspect);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit prospect' : 'Add prospect'}</DialogTitle>
          <DialogDescription>
            Capture contact details, temperature, next follow-up, and the current pipeline stage.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          {canChooseAgent ? (
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Assigned agent</span>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={agentCode}
                onChange={(event) => setAgentCode(event.target.value)}
              >
                {agents.map((agent) => (
                  <option key={agent.value} value={agent.value}>
                    {agent.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Client name</span>
            <Input value={clientName} onChange={(event) => setClientName(event.target.value)} />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Contact number</span>
            <Input value={contactNumber} onChange={(event) => setContactNumber(event.target.value)} />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Email</span>
            <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Temperature</span>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={temperature}
              onChange={(event) => setTemperature(event.target.value as (typeof prospectTemperatures)[number])}
            >
              {prospectTemperatures.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Pipeline stage</span>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={pipelineStage}
              onChange={(event) => setPipelineStage(event.target.value as (typeof prospectPipelineStages)[number])}
            >
              {prospectPipelineStages.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium text-foreground">Follow-up reminder</span>
            <Input
              type="datetime-local"
              value={followUpDateUtc}
              onChange={(event) => setFollowUpDateUtc(event.target.value)}
            />
          </label>

          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium text-foreground">Notes</span>
            <textarea
              className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isPending || !clientName.trim() || !contactNumber.trim()}>
            {isEditing ? 'Save prospect' : 'Add prospect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
