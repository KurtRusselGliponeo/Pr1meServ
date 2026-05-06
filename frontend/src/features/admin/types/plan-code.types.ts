import type { CreatePlanCode, UpdatePlanCode } from '@a1prime/schemas';

export interface PlanCodeReference {
  id: string;
  planCode: string;
  planName: string;
  productCategory: string;
  classification: 'OLUL' | 'ANH' | 'Other';
  isActive: boolean;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export type PlanCodeFormValues = CreatePlanCode;
export type UpdatePlanCodePayload = UpdatePlanCode;
