export const queryKeys = {
  clientProfiles: (page: number, filters: Record<string, string | number | undefined>) =>
    ['client-profiles', page, filters] as const,
  cosafApprovals: ['cosaf-approvals'] as const,
  importProfiles: ['import-profiles'] as const,
  reassignClients: ['reassign-clients'] as const,
  reassignPreflight: ['reassign-preflight'] as const,
  agentLookup: (search: string) => ['agent-lookup', search] as const,
  agentProfile: (agentId: string) => ['agent-profile', agentId] as const,
  agentDashboard: ['agent-dashboard'] as const,
  branchManagerDashboard: (filters: Record<string, string | number | undefined>) =>
    ['branch-manager-dashboard', filters] as const,
  updateAgent: ['update-agent'] as const,
  metrics: (filterRole: string, month: number, year: number) =>
    ['metrics', filterRole, month, year] as const,
  performanceLeaderboard: (month: number, year: number) =>
    ['performance-leaderboard', month, year] as const,
  documents: (category?: string) => ['documents', category ?? 'all'] as const,
  prospects: (filters: string) => ['prospects', filters] as const,
  createProspect: ['create-prospect'] as const,
  updateProspect: ['update-prospect'] as const,
  updateProspectStage: ['update-prospect-stage'] as const,
  lapsation: (filters: string) => ['lapsation', filters] as const,
  notificationLogs: ['notification-logs'] as const,
  adminOverview: ['admin-overview'] as const,
  adminSearch: (query: string) => ['admin-search', query] as const,
  adminSystemLogs: ['admin-system-logs'] as const,
  users: (pagination: string, roleFilter: string) => ['users', pagination, roleFilter] as const,
  createUser: ['create-user'] as const,
  updateUser: ['update-user'] as const,
  restoreUser: ['restore-user'] as const,
  resetUserPassword: ['reset-user-password'] as const,
  clientTimeline: (clientProfileId: string) => ['client-timeline', clientProfileId] as const,
};
