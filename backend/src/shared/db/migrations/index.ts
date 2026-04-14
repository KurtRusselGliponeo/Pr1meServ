import { userAccountsMigration } from './001_UserAccounts';
import { agentProfilesMigration } from './002_AgentProfiles';
import { clientProfilesMigration } from './003_ClientProfiles';
import { performanceMetricsMigration } from './004_PerformanceMetrics';
import { systemAuditLogsMigration } from './005_SystemAuditLogs';
import { userAccountRefreshTokensMigration } from './006_UserAccountRefreshTokens';

export const phaseOneMigrations = [
  userAccountsMigration,
  agentProfilesMigration,
  clientProfilesMigration,
  performanceMetricsMigration,
  systemAuditLogsMigration,
];

export const applicationMigrations = [...phaseOneMigrations, userAccountRefreshTokensMigration];
