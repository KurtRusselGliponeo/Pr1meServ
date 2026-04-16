export const queryKeys = {
  clientProfiles: (page: number, filters: Record<string, string | number | undefined>) =>
    ['client-profiles', page, filters] as const,
  importProfiles: ['import-profiles'] as const,
  reassignClients: ['reassign-clients'] as const,
  agentProfile: (agentId: string) => ['agent-profile', agentId] as const,
  updateAgent: ['update-agent'] as const,
  metrics: (filterRole: string, month: number, year: number) =>
    ['metrics', filterRole, month, year] as const,
  users: (pagination: string, roleFilter: string) => ['users', pagination, roleFilter] as const,
  createUser: ['create-user'] as const,
};
