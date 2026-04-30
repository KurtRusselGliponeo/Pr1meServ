'use client';

import {
  AgentLookupResponseSchema,
  CosafApprovalListResponseSchema,
  GetPerformanceMetricsQuerySchema,
  LapsationDashboardResponseSchema,
  ListAgentsQuerySchema,
  ListProspectsQuerySchema,
  ListClientProfilesQuerySchema,
  ListClientProfilesResponseSchema,
  ListProspectsResponseSchema,
  PerformanceLeaderboardQuerySchema,
  PerformanceLeaderboardResponseSchema,
  PerformanceMetricsResponseSchema,
  listDocumentsResponseSchema,
} from '@a1prime/schemas';

import api from '@/services/api-client';

export interface ClientProfilesPrefetchFilters {
  status?: string;
  agentId?: string;
  branchCode?: string;
  product?: string;
  search?: string;
}

export interface DocumentPrefetchFilters {
  category?: string;
  search?: string;
  fileType?: string;
  includeArchived?: boolean;
}

const VALID_CLIENT_STATUSES = [
  'Uncontacted',
  'Contacted',
  'Forms Submitted',
  'BM Signed',
  'Done',
  'Returned',
  'Orphan',
] as const;

export async function fetchClientProfiles(
  page: number,
  filters: ClientProfilesPrefetchFilters,
  pageSize = 10,
) {
  const normalizedSearch = filters.search?.trim() || undefined;
  const params = ListClientProfilesQuerySchema.parse({
    page,
    pageSize,
    status: VALID_CLIENT_STATUSES.includes(filters.status as (typeof VALID_CLIENT_STATUSES)[number])
      ? filters.status
      : undefined,
    agentId: filters.agentId || undefined,
    branchCode: filters.branchCode || undefined,
    product: filters.product || undefined,
    search: normalizedSearch,
  });

  const response = await api.get('/client-profiles', { params });
  return ListClientProfilesResponseSchema.parse(response.data);
}

export async function fetchCosafApprovals() {
  const response = await api.get('/cosaf-approvals');
  return CosafApprovalListResponseSchema.parse(response.data);
}

export async function fetchDocuments(filters: DocumentPrefetchFilters = {}) {
  const response = await api.get('/documents', {
    params: {
      category: filters.category,
      search: filters.search?.trim() || undefined,
      fileType: filters.fileType?.trim() || undefined,
      includeArchived: filters.includeArchived ?? false,
    },
  });

  return listDocumentsResponseSchema.parse(response.data);
}

export async function fetchLapsationDashboard() {
  const response = await api.get('/lapsation');
  return LapsationDashboardResponseSchema.parse(response.data);
}

export async function fetchAgents(search = '') {
  const normalizedSearch = search.trim();
  const params = ListAgentsQuerySchema.parse({
    search: normalizedSearch || undefined,
    limit: 12,
  });
  const response = await api.get('/agents', { params });
  return AgentLookupResponseSchema.parse(response.data);
}

export async function fetchPerformanceMetrics(month: number, year: number, filterRole = 'all') {
  const params = GetPerformanceMetricsQuerySchema.parse({
    month,
    year,
    role: filterRole,
  });
  const response = await api.get('/metrics', { params });
  return PerformanceMetricsResponseSchema.parse(response.data);
}

export async function fetchPerformanceLeaderboard(month: number, year: number) {
  const params = PerformanceLeaderboardQuerySchema.parse({ month, year });
  const response = await api.get('/metrics/leaderboard', { params });
  return PerformanceLeaderboardResponseSchema.parse(response.data);
}

export async function fetchProspects(filters: Record<string, unknown>) {
  const params = ListProspectsQuerySchema.parse(filters);
  const response = await api.get('/prospects', { params });
  return ListProspectsResponseSchema.parse(response.data);
}
