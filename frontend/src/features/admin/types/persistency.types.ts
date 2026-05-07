import type { ManualPersistencyInput, UpdateManualPersistency } from '@a1prime/schemas';

export interface PersistencyRecord {
  id: string;
  agentId: string;
  agentName: string;
  agentCode: string;
  recordMonth: string;
  branchCode: string | null;
  agentType: string | null;
  team: string | null;
  personalPersistency: number;
  unitPersistency: number;
  branchPersistency: number;
  isLowPersistency: boolean;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface PersistencyListResponse {
  data: PersistencyRecord[];
  meta: { total: number; page: number; pageSize: number };
}

export type PersistencyFormValues = ManualPersistencyInput;
export type UpdatePersistencyPayload = UpdateManualPersistency;
