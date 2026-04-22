import { userAccountsMigration } from './001_UserAccounts';
import { agentProfilesMigration } from './002_AgentProfiles';
import { clientProfilesMigration } from './003_ClientProfiles';
import { performanceMetricsMigration } from './004_PerformanceMetrics';
import { systemAuditLogsMigration } from './005_SystemAuditLogs';
import { clientProfileOrphansMigration } from './006_ClientProfileOrphans';
import { documentLibraryEnhancementsMigration } from './007_DocumentLibraryEnhancements';
import { clientProfileStatusesMigration } from './008_ClientProfileStatuses';
import { clientProfilesSearchIndexMigration } from './009_ClientProfilesSearchIndex';
import { queryPerformanceIndexesMigration } from './010_QueryPerformanceIndexes';
import { rowLevelSecurityMigration } from './011_RowLevelSecurity';
import { rlsPoliciesMigration } from './012_RlsPolicies';
import { needsPasswordResetMigration } from './013_NeedsPasswordReset';
import { prospectsMigration } from './014_Prospects';
import { agentStatusesMigration } from './015_AgentStatuses';
import { orphanPoolAgentMigration } from './016_OrphanPoolAgent';

export const phaseOneMigrations = [
  userAccountsMigration,
  agentProfilesMigration,
  clientProfilesMigration,
  performanceMetricsMigration,
  systemAuditLogsMigration,
  clientProfileOrphansMigration,
  documentLibraryEnhancementsMigration,
  clientProfileStatusesMigration,
];

export const phaseTwoMigrations = [
  clientProfilesSearchIndexMigration,
  queryPerformanceIndexesMigration,
];

export const phaseThreeMigrations = [
  rowLevelSecurityMigration,
];

export const phaseFourMigrations = [
  rlsPoliciesMigration,
];

export const applicationMigrations = [
  ...phaseOneMigrations,
  ...phaseTwoMigrations,
  ...phaseThreeMigrations,
  ...phaseFourMigrations,
  needsPasswordResetMigration,
  prospectsMigration,
  agentStatusesMigration,
  orphanPoolAgentMigration,
];
