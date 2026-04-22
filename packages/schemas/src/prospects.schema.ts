import { z } from 'zod';

export const prospectTemperatures = ['Warm', 'Cold'] as const;
export const prospectTemperatureSchema = z.enum(prospectTemperatures);
export type ProspectTemperature = z.infer<typeof prospectTemperatureSchema>;

export const prospectPipelineStages = [
  'Cold Prospect',
  'Contacted',
  'Presentation',
  'Agreed',
  'Closed',
] as const;
export const prospectPipelineStageSchema = z.enum(prospectPipelineStages);
export type ProspectPipelineStage = z.infer<typeof prospectPipelineStageSchema>;

export const ProspectSchema = z.object({
  id: z.string().uuid(),
  agentCode: z.string().min(1),
  clientName: z.string().min(1),
  contactNumber: z.string().min(1),
  temperature: prospectTemperatureSchema,
  pipelineStage: prospectPipelineStageSchema,
  createdAtUtc: z.string().datetime(),
  updatedAtUtc: z.string().datetime(),
});
export type Prospect = z.infer<typeof ProspectSchema>;

export const ListProspectsQuerySchema = z.object({
  agentCode: z.string().trim().min(1).max(50).optional(),
});
export type ListProspectsQuery = z.infer<typeof ListProspectsQuerySchema>;

export const ListProspectsResponseSchema = z.object({
  data: z.array(ProspectSchema),
});
export type ListProspectsResponse = z.infer<typeof ListProspectsResponseSchema>;

export const UpdateProspectStageSchema = z.object({
  pipelineStage: prospectPipelineStageSchema,
});
export type UpdateProspectStage = z.infer<typeof UpdateProspectStageSchema>;
