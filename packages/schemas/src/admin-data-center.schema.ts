import { z } from 'zod';

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD.');
const recordMonthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Record month must use YYYY-MM.');
const nonNegativeMoneySchema = z.coerce.number().finite().nonnegative();
const optionalTrimmedText = z.string().trim().min(1).optional();
const nullableTrimmedText = z.string().trim().min(1).nullable().optional();
const manualPolicyStatusSchema = z.enum([
  'Active',
  'At Risk',
  'Lapsed',
  'Reinstated',
  'Cancelled',
  'Matured',
  'Pending',
]);

export const planCodeClassifications = ['OLUL', 'ANH', 'Other'] as const;
export const planCodeClassificationSchema = z.enum(planCodeClassifications);
export type PlanCodeClassification = z.infer<typeof planCodeClassificationSchema>;

export const createPlanCodeSchema = z.object({
  planCode: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()),
  planName: z.string().trim().min(1).max(255),
  productCategory: z.string().trim().min(1).max(120),
  classification: planCodeClassificationSchema,
  isActive: z.boolean().default(true),
  notes: z.string().trim().max(1000).nullable().optional(),
});
export type CreatePlanCode = z.infer<typeof createPlanCodeSchema>;

export const updatePlanCodeSchema = createPlanCodeSchema.partial().extend({
  planCode: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()).optional(),
});
export type UpdatePlanCode = z.infer<typeof updatePlanCodeSchema>;

export const listPlanCodesQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  productCategory: z.string().trim().min(1).max(120).optional(),
  classification: planCodeClassificationSchema.optional(),
  includeInactive: z.coerce.boolean().default(false),
});
export type ListPlanCodesQuery = z.infer<typeof listPlanCodesQuerySchema>;

export const policyModes = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Single', 'Other'] as const;
export const policyModeSchema = z.enum(policyModes);
export type PolicyMode = z.infer<typeof policyModeSchema>;

export const manualPolicyInputSchema = z.object({
  clientProfileId: z.string().uuid().nullable().optional(),
  assignedAgentId: z.string().uuid().optional(),
  policyNumber: z.string().trim().min(1).max(50),
  branchCode: z.string().trim().min(1).max(50),
  policyOwnerName: z.string().trim().min(1).max(255).optional(),
  lifeInsuredName: z.string().trim().min(1).max(255).optional(),
  planCode: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()).optional(),
  planName: z.string().trim().min(1).max(255).optional(),
  currency: z.string().trim().min(3).max(20).default('PHP'),
  firstIssueDate: dateStringSchema.optional(),
  mode: policyModeSchema.optional(),
  modalPremium: nonNegativeMoneySchema.default(0),
  sumAssured: nonNegativeMoneySchema.default(0),
  api: nonNegativeMoneySchema.default(0),
  policyStatus: manualPolicyStatusSchema.default('Active'),
  notes: z.string().trim().max(2000).nullable().optional(),
});
export type ManualPolicyInput = z.infer<typeof manualPolicyInputSchema>;

export const updateManualPolicySchema = manualPolicyInputSchema.partial().extend({
  clientProfileId: z.string().uuid().optional(),
  policyNumber: z.string().trim().min(1).max(50).optional(),
});
export type UpdateManualPolicy = z.infer<typeof updateManualPolicySchema>;

export const listManualPoliciesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(15),
  search: z.string().trim().min(1).max(100).optional(),
  agentId: z.string().uuid().optional(),
  branchCode: z.string().trim().min(1).max(50).optional(),
  planCode: z.string().trim().min(1).max(50).optional(),
  policyStatus: manualPolicyStatusSchema.optional(),
  issuedFrom: dateStringSchema.optional(),
  issuedTo: dateStringSchema.optional(),
});
export type ListManualPoliciesQuery = z.infer<typeof listManualPoliciesQuerySchema>;

export const policyStatusHistoryInputSchema = z.object({
  policyId: z.string().uuid(),
  previousStatus: manualPolicyStatusSchema.nullable().optional(),
  nextStatus: manualPolicyStatusSchema,
  effectiveAtUtc: z.string().datetime(),
  reason: z.string().trim().min(1).max(255).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});
export type PolicyStatusHistoryInput = z.infer<typeof policyStatusHistoryInputSchema>;

export const napTransactionTypes = [
  'Issued',
  'Lapsed',
  'Reinstated',
  'Cooling Off',
  'Increase/Decrease',
  'Cancelled',
  'Other',
] as const;
export const napTransactionTypeSchema = z.enum(napTransactionTypes);
export type NapTransactionType = z.infer<typeof napTransactionTypeSchema>;

export const manualNapTransactionInputSchema = z.object({
  policyId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  policyNumber: z.string().trim().min(1).max(100),
  accountType: z.string().trim().min(1).max(100).optional(),
  contractTypeCode: z.string().trim().min(1).max(50).optional(),
  typeDesc: z.string().trim().min(1).max(255).optional(),
  transactionDate: z.string().datetime(),
  tempReceiptDate: z.string().datetime().optional(),
  transactionType: napTransactionTypeSchema,
  api: nonNegativeMoneySchema.default(0),
  ccCredit: z.coerce.number().int().nonnegative().optional(),
  creditStatus: z.string().trim().min(1).max(100).optional(),
  branchCode: z.string().trim().min(1).max(50).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});
export type ManualNapTransactionInput = z.infer<typeof manualNapTransactionInputSchema>;

export const updateManualNapTransactionSchema = manualNapTransactionInputSchema.partial().extend({
  agentId: z.string().uuid().optional(),
  policyNumber: z.string().trim().min(1).max(100).optional(),
  transactionDate: z.string().datetime().optional(),
  transactionType: napTransactionTypeSchema.optional(),
});
export type UpdateManualNapTransaction = z.infer<typeof updateManualNapTransactionSchema>;

export const listManualNapTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(15),
  search: z.string().trim().min(1).max(100).optional(),
  agentId: z.string().uuid().optional(),
  branchCode: z.string().trim().min(1).max(50).optional(),
  transactionType: napTransactionTypeSchema.optional(),
  creditStatus: z.string().trim().min(1).max(100).optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
});
export type ListManualNapTransactionsQuery = z.infer<typeof listManualNapTransactionsQuerySchema>;

export const recruitmentStatuses = ['Active', 'Terminated', 'Reinstated', 'Pending'] as const;
export const recruitmentStatusSchema = z.enum(recruitmentStatuses);
export type RecruitmentStatus = z.infer<typeof recruitmentStatusSchema>;

export const manualRecruitmentInputSchema = z.object({
  agentId: z.string().uuid(),
  agentCode: z.string().trim().min(1).max(50).optional(),
  agentName: z.string().trim().min(1).max(255).optional(),
  recruiter: z.string().trim().min(1).max(255).optional(),
  umCode: optionalTrimmedText,
  umName: optionalTrimmedText,
  bmCode: optionalTrimmedText,
  bmName: optionalTrimmedText,
  team: z.string().trim().min(1).max(120).optional(),
  birthday: dateStringSchema.optional(),
  dateAppointed: z.string().datetime(),
  dateTerminated: z.string().datetime().nullable().optional(),
  status: recruitmentStatusSchema,
  contacts: z.string().trim().min(1).max(255).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});
export type ManualRecruitmentInput = z.infer<typeof manualRecruitmentInputSchema>;

export const updateManualRecruitmentSchema = manualRecruitmentInputSchema.partial().extend({
  agentId: z.string().uuid().optional(),
  dateAppointed: z.string().datetime().optional(),
  status: recruitmentStatusSchema.optional(),
});
export type UpdateManualRecruitment = z.infer<typeof updateManualRecruitmentSchema>;

export const listManualRecruitmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(15),
  search: z.string().trim().min(1).max(100).optional(),
  recruiter: z.string().trim().min(1).max(255).optional(),
  team: z.string().trim().min(1).max(120).optional(),
  status: recruitmentStatusSchema.optional(),
  appointedFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  appointedTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type ListManualRecruitmentsQuery = z.infer<typeof listManualRecruitmentsQuerySchema>;

export const recruitmentStatusActionSchema = z.object({
  dateTerminated: z.string().datetime().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});
export type RecruitmentStatusAction = z.infer<typeof recruitmentStatusActionSchema>;

export const manualPersistencyInputSchema = z.object({
  agentId: z.string().uuid(),
  recordMonth: recordMonthSchema,
  branchCode: z.string().trim().min(1).max(50).optional(),
  agentType: z.string().trim().min(1).max(50).optional(),
  team: z.string().trim().min(1).max(120).optional(),
  personalPersistency: z.coerce.number().finite().min(0).max(100),
  unitPersistency: z.coerce.number().finite().min(0).max(100).default(0),
  branchPersistency: z.coerce.number().finite().min(0).max(100).default(0),
  notes: z.string().trim().max(2000).nullable().optional(),
});
export type ManualPersistencyInput = z.infer<typeof manualPersistencyInputSchema>;

export const updateManualPersistencySchema = manualPersistencyInputSchema.partial().extend({
  agentId: z.string().uuid().optional(),
  recordMonth: recordMonthSchema.optional(),
});
export type UpdateManualPersistency = z.infer<typeof updateManualPersistencySchema>;

export const listManualPersistencyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(100).optional(),
  recordMonth: recordMonthSchema.optional(),
  fromMonth: recordMonthSchema.optional(),
  toMonth: recordMonthSchema.optional(),
  agentId: z.string().uuid().optional(),
  branchCode: z.string().trim().min(1).max(50).optional(),
  agentType: z.string().trim().min(1).max(50).optional(),
  team: z.string().trim().min(1).max(120).optional(),
  lowOnly: z.coerce.boolean().default(false),
});
export type ListManualPersistencyQuery = z.infer<typeof listManualPersistencyQuerySchema>;

export const dataValidationModules = [
  'Policy',
  'PlanCode',
  'NAP',
  'Recruitment',
  'Persistency',
  'PolicyStatus',
] as const;
export const dataValidationModuleSchema = z.enum(dataValidationModules);
export type DataValidationModule = z.infer<typeof dataValidationModuleSchema>;

export const dataValidationSeverities = ['info', 'warning', 'error'] as const;
export const dataValidationSeveritySchema = z.enum(dataValidationSeverities);
export type DataValidationSeverity = z.infer<typeof dataValidationSeveritySchema>;

export const dataValidationStatuses = ['Open', 'Resolved', 'Ignored'] as const;
export const dataValidationStatusSchema = z.enum(dataValidationStatuses);
export type DataValidationStatus = z.infer<typeof dataValidationStatusSchema>;

export const dataValidationIssueInputSchema = z.object({
  module: dataValidationModuleSchema,
  entityName: nullableTrimmedText,
  entityId: z.string().uuid().nullable().optional(),
  issueCode: z.string().trim().min(1).max(80),
  severity: dataValidationSeveritySchema.default('error'),
  status: dataValidationStatusSchema.default('Open'),
  details: z.string().trim().min(1).max(4000),
  recommendedFix: z.string().trim().max(4000).nullable().optional(),
  rawPayload: z.record(z.unknown()).nullable().optional(),
});
export type DataValidationIssueInput = z.infer<typeof dataValidationIssueInputSchema>;

export const updateDataValidationIssueSchema = z.object({
  status: dataValidationStatusSchema,
  recommendedFix: z.string().trim().max(4000).nullable().optional(),
});
export type UpdateDataValidationIssue = z.infer<typeof updateDataValidationIssueSchema>;
