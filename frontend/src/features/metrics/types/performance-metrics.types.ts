export interface PerformanceMetricPoint {
  month: string;
  label: string;
  modalPremium: number;
  api: number;
  sumAssured: number;
  commissionAmount: number;
}

export interface PerformanceMetricSummary {
  activeAgents: number;
  totalApi: number;
  totalModalPremium: number;
  totalCommission: number;
}

export interface PerformanceMetricsResponse {
  generatedAtUtc: string;
  summary: PerformanceMetricSummary;
  points: PerformanceMetricPoint[];
}
