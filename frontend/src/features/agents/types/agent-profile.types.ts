export interface AgentAuditTrailEntry {
  id: string;
  action: string;
  actorName: string;
  timestampUtc: string;
  summary: string;
}

export interface AgentProfile {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  agentCode: string;
  role: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  auditTrail: AgentAuditTrailEntry[];
}

export interface UpdateAgentProfilePayload {
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
}
