# Phase 2 and Phase 3 Execution Lock

This document converts the approved next-phase scope into implementation-ready checklist items for identity, access control, and normalized branch operations data.

## Phase 2: Identity, Accounts, and Access Control

- [ ] Create account creation flow for agents using `PRULife email`.
- [ ] Set default password for agent as the `8-digit agent code`.
- [ ] Force password change on first login.
- [ ] Link each agent account to exactly one agent profile.
- [ ] Prevent agents from viewing other agents' accounts, clients, metrics, or documents.
- [ ] Add role-based sidebar menus per account type.
- [ ] Add secure profile picture upload and storage named by `agentCode`.
- [ ] Add audit logs for login, password reset, and user access changes.

### Phase 2 locked implementation notes

- Agent account creation must use the official `PRULife` email address as the login identity.
- Default credentials are temporary only and must be rotated on first successful login.
- `NeedsPasswordReset` should remain the enforcement flag for first-login password change flow.
- User-to-agent linkage must be `1:1`; no shared agent profiles across multiple accounts and no account linked to multiple agent profiles.
- Agents must be restricted through both route authorization and data-level filtering.
- Agents must not see orphan operational queues unless a future signed-off requirement introduces a dedicated agent-facing orphan workflow.
- Sidebar navigation must be role-aware for `Admin`, `BranchManager`, and `Agent`.
- Profile picture object keys should be deterministic from `agentCode` and stored in secure managed storage.
- Security-sensitive actions must be captured in audit logs with actor, target, action, and timestamp.

### Phase 2 delivery slices

1. Account provisioning and first-login enforcement
2. Access control hardening and agent isolation
3. Role-based navigation
4. Profile picture storage flow
5. Audit log expansion

## Phase 3: Data Model and Data Sources

- [ ] Normalize core tables: `users`, `agent_profiles`, `client_profiles`, `policies`, `policy_transactions`, `recruitment_records`, `performance_metrics`, `prospects`, `documents`, `notifications`, `audit_logs`.
- [ ] Connect and import source files: `NAP`, `APE`, `PER`, `REC`.
- [ ] Create branch-level ownership mapping for agents and clients.
- [ ] Store full client history per assigned agent.
- [ ] Store reassignment history so there is a full audit trail.
- [ ] Add validation rules for duplicate client, duplicate policy, broken agent code, and missing IDs.

### Phase 3 locked implementation notes

- `users` must remain the authentication and authorization anchor.
- `agent_profiles` must contain operational agent identity and branch linkage.
- `client_profiles` must represent the current client assignment and workflow state.
- `policies` should separate policy identity from client workflow state where source data requires policy-granular history.
- `policy_transactions` should absorb transaction-level import records such as lapsation and premium movement history.
- `recruitment_records` should store REC-derived recruitment facts separately from monthly rollups.
- `performance_metrics` should remain a reporting aggregate store, not the sole source of truth for raw imports.
- `prospects`, `documents`, `notifications`, and `audit_logs` should remain distinct bounded tables.
- Source import pipelines for `NAP`, `APE`, `PER`, and `REC` must preserve enough raw identifiers to reconcile imported records against agent, client, and policy entities.
- Branch ownership must be explicit and queryable for both agents and clients.
- Branch-scoped operations for `BranchManager` must be enforced in service logic, not only hidden in the UI.
- Client history must preserve assignment changes over time rather than overwriting prior ownership without trace.
- Reassignment history must support who changed it, when it changed, from whom, to whom, and why.
- Validation must reject or quarantine malformed imports instead of silently accepting broken data.

### Phase 3 validation rules

- Duplicate client:
  - detect by stable business key set such as client identity plus policy linkage, not only by name
- Duplicate policy:
  - reject or quarantine repeated `policyNumber` records unless explicitly treated as an update event
- Broken agent code:
  - flag imports whose `agentCode` cannot be matched to a known active or historical agent record
- Missing IDs:
  - reject or quarantine rows missing required business identifiers needed for reconciliation

## Repo Alignment Snapshot

### Already present in the repo

- Roles and role-aware authorization foundations
- `users`, `agent_profiles`, `client_profiles`, `performance_metrics`, `prospects`, `documents`, and audit-oriented structures
- Existing source-oriented tables for imported performance data such as `APE`
- Existing route matrix documenting Admin, BranchManager, and Agent access boundaries

### Still needed for these phases

- Formal agent provisioning flow tied to `PRULife` email
- Explicit enforcement of temporary password = `8-digit agent code`
- First-login password-change enforcement across the full user lifecycle
- Stronger agent-to-agent isolation checks for accounts, clients, metrics, and documents
- Stronger branch-level isolation checks for `BranchManager` actions on agents, clients, metrics, and orphan workflows
- Secure agent profile photo storage flow
- Expanded audit events for identity and access changes
- Fully normalized `policies`, `policy_transactions`, and `recruitment_records` structures if not already present
- Branch ownership mapping for both agents and clients
- Full client ownership history and reassignment history model
- Import validation and quarantine strategy for duplicate or malformed source rows

## Immediate Follow-up

- Add migrations and shared schemas for any missing normalized tables.
- Add or tighten route and row-level access controls for agent isolation.
- Extend user provisioning logic to support `PRULife` email onboarding and temporary credentials.
- Add audit event types for login, password reset, account creation, role change, and access changes.
- Add branch ownership entities and foreign keys.
- Add reassignment-history tables or event logs with reason capture.
- Add import validation and exception handling for `NAP`, `APE`, `PER`, and `REC`.
