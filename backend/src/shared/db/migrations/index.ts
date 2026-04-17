import { userAccountsMigration } from './001_UserAccounts';
import { agentProfilesMigration } from './002_AgentProfiles';
import { clientProfilesMigration } from './003_ClientProfiles';
import { performanceMetricsMigration } from './004_PerformanceMetrics';
import { systemAuditLogsMigration } from './005_SystemAuditLogs';
import { clientProfileOrphansMigration } from './006_ClientProfileOrphans';
import { documentLibraryEnhancementsMigration } from './007_DocumentLibraryEnhancements';
import { clientProfileStatusesMigration } from './008_ClientProfileStatuses';

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

export const applicationMigrations = [...phaseOneMigrations];
