import { z } from 'zod';

export const prospectTemperatures = ['Warm', 'Cold'] as const;
export const prospectTemperatureSchema = z.enum(prospectTemperatures);
export type ProspectTemperature = z.infer<typeof prospectTemperatureSchema>;

export const prospectPipelineStages = [
  'Contacted',
  'Client Agreed',
  'Presentation',
  'Approved',
  'Closed',
] as const;
export const prospectPipelineStageSchema = z.enum(prospectPipelineStages);
export type ProspectPipelineStage = z.infer<typeof prospectPipelineStageSchema>;

export const ProspectSchema = z.object({
  id: z.string().uuid(),
  agentCode: z.string().min(1),
  branchCode: z.string().min(1),
  clientName: z.string().min(1),
  contactNumber: z.string().min(1),
  email: z.string().email().nullable(),
  temperature: prospectTemperatureSchema,
  pipelineStage: prospectPipelineStageSchema,
  notes: z.string().nullable(),
  followUpDateUtc: z.string().datetime().nullable(),
  lastContactedAtUtc: z.string().datetime().nullable(),
  createdAtUtc: z.string().datetime(),
  updatedAtUtc: z.string().datetime(),
});
export type Prospect = z.infer<typeof ProspectSchema>;

export const ListProspectsQuerySchema = z.object({
  agentCode: z.string().trim().min(1).max(50).optional(),
  temperature: prospectTemperatureSchema.optional(),
  pipelineStage: prospectPipelineStageSchema.optional(),
  search: z.string().trim().min(1).max(120).optional(),
  dueOnly: z.coerce.boolean().optional(),
});
export type ListProspectsQuery = z.infer<typeof ListProspectsQuerySchema>;

export const ListProspectsResponseSchema = z.object({
  data: z.array(ProspectSchema),
});
export type ListProspectsResponse = z.infer<typeof ListProspectsResponseSchema>;

const followUpDateSchema = z.string().datetime().nullable().optional();
const prospectEmailSchema = z.string().trim().email().nullable().optional();
const prospectNotesSchema = z.string().trim().max(4000).nullable().optional();

export const CreateProspectSchema = z.object({
  agentCode: z.string().trim().min(1).max(50).optional(),
  clientName: z.string().trim().min(1).max(200),
  contactNumber: z.string().trim().min(1).max(50),
  email: prospectEmailSchema,
  temperature: prospectTemperatureSchema,
  pipelineStage: prospectPipelineStageSchema.default('Contacted'),
  notes: prospectNotesSchema,
  followUpDateUtc: followUpDateSchema,
});
export type CreateProspect = z.infer<typeof CreateProspectSchema>;

export const UpdateProspectStageSchema = z.object({
  pipelineStage: prospectPipelineStageSchema,
});
export type UpdateProspectStage = z.infer<typeof UpdateProspectStageSchema>;

export const UpdateProspectSchema = z.object({
  clientName: z.string().trim().min(1).max(200).optional(),
  contactNumber: z.string().trim().min(1).max(50).optional(),
  email: prospectEmailSchema,
  temperature: prospectTemperatureSchema.optional(),
  pipelineStage: prospectPipelineStageSchema.optional(),
  notes: prospectNotesSchema,
  followUpDateUtc: followUpDateSchema,
});
export type UpdateProspect = z.infer<typeof UpdateProspectSchema>;
