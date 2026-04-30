# Operational Recovery Jira Backlog

This backlog is organized by phase, with each item written so it can be copied into Jira as an epic or story with direct acceptance criteria.

## Phase 0 - Operational Baseline

### Epic: ORP-P0 Operational Baseline

Success metric: Local and shared environments expose app health, worker heartbeat, queue availability, and migration status in one documented runbook with no manual DB inspection required.

#### Story: ORP-P0-01 Publish a documented local operations runbook

Targets:

- `README.md`
- `backend/package.json`
- `frontend/package.json`
- `docker-compose.yml`

Acceptance criteria:

- Runbook covers API startup, frontend startup, worker startup, DB startup, and migration commands.
- Runbook includes expected healthy outputs and known-failure checks.
- Runbook documents how to verify queue and worker readiness locally.
- Runbook is stored in the repo and linked from a root-level doc.

#### Story: ORP-P0-02 Add startup diagnostics endpoint

Targets:

- `backend/src/app.ts`
- `backend/src/routes`
- `backend/src/jobs/worker.ts`
- `backend/src/shared/lib/queue.ts`

Acceptance criteria:

- API exposes a diagnostics endpoint that reports app readiness.
- Response includes worker heartbeat freshness, queue connectivity, and migration status summary.
- Endpoint returns a degraded status when queue or worker heartbeat checks fail.
- Diagnostics output is safe for internal ops use and excludes secrets.

#### Story: ORP-P0-03 Add migration guard for required constraints

Targets:

- `backend/src/shared/db/migrations`
- `backend/src/shared/db/migrations/index.ts`
- `backend/src/shared/db/migrations/runner.ts`

Acceptance criteria:

- Startup or migration flow validates required status constraints before app is considered healthy.
- Guard fails fast when required enums/check constraints are missing.
- Guard result is visible through diagnostics output.
- Team can run the validation locally without manual SQL edits.

#### Story: ORP-P0-04 Add baseline smoke checks for local startup

Targets:

- `backend/tests` or `backend/src/**/__tests__`
- `frontend` smoke check location as applicable

Acceptance criteria:

- Smoke checks verify API boot, diagnostics endpoint success, and queue availability handling.
- Smoke checks are runnable in CI or local pre-release flow.
- Failures clearly identify API, migration, or worker causes.

## Phase 1 - Access and Governance Hardening

### Epic: ORP-P1 Access and Governance

Success metric: Admin can safely edit, archive, restore, and reset-password users without permission drift or self-destructive flows, and route authorization is documented and enforced.

#### Story: ORP-P1-01 Add PATCH `/users/:id` endpoint for role and profile edits

Targets:

- `backend/src/routes/users.routes.ts`
- `backend/src/services/users.service.ts`
- shared schemas for request/response payloads
- `frontend/src/features/admin/components`

Acceptance criteria:

- Admin can update user role, display name, and other approved editable fields.
- Validation rejects illegal role values and immutable field edits.
- Changes produce an audit log entry with actor, target user, and diff summary.
- Frontend exposes edit UI with success and error feedback.

#### Story: ORP-P1-02 Add POST `/users/:id/restore`

Targets:

- `backend/src/routes/users.routes.ts`
- `backend/src/services/users.service.ts`
- `frontend/src/features/admin/components`

Acceptance criteria:

- Admin can restore soft-deleted users from the UI.
- Restored users regain intended access state without password reset side effects.
- Restore action is audited.
- User list can surface archived and restored states clearly.

#### Story: ORP-P1-03 Add POST `/users/:id/reset-password`

Targets:

- `backend/src/routes/users.routes.ts`
- `backend/src/services/users.service.ts`
- `frontend/src/features/admin/components`
- notification or identity integration as applicable

Acceptance criteria:

- Admin can trigger a password reset flow from the UI.
- Flow follows the approved identity pattern for token generation or reset delivery.
- Sensitive response details are not exposed in the UI or API payload.
- Reset attempts are audited and permission-protected.

#### Story: ORP-P1-04 Add self-delete guard in users service

Targets:

- `backend/src/services/users.service.ts`

Acceptance criteria:

- A user cannot archive or delete their own account through admin lifecycle actions.
- API returns a clear validation error for self-delete attempts.
- Guard is covered by unit or integration tests.
- Existing archive flows for other users continue to work.

#### Story: ORP-P1-05 Formalize route authorization matrix

Targets:

- `backend/src/routes/users.routes.ts`
- `backend/src/routes/documents.routes.ts`
- `backend/src/routes/notifications.routes.ts`
- `frontend` navigation and action surfaces tied to those permissions

Acceptance criteria:

- Route-by-route role matrix exists in repo docs.
- Middleware or route guards match the approved matrix.
- Unauthorized actions return consistent error shapes.
- Sensitive actions produce audit log entries.

#### Story: ORP-P1-06 Add role-critical smoke tests

Targets:

- backend integration/e2e test locations
- frontend test locations as applicable

Acceptance criteria:

- Tests cover edit user, restore user, reset password authorization, and self-delete denial.
- Tests assert both successful and forbidden paths.
- Smoke suite is ready before Phase 2 begins.

## Phase 2 - Complete BM COSAF + Documents Workflow

### Epic: ORP-P2 BM COSAF and Documents Completion

Success metric: A Branch Manager can complete the upload-to-approval workflow entirely in product, with explicit status progress and no manual backfill.

#### Story: ORP-P2-01 Wire document upload flow to backend lifecycle

Targets:

- `backend/src/routes/documents.routes.ts`
- `backend/src/services/documents.service.ts`
- `frontend/src/features/documents/hooks/use-get-documents.ts`
- `frontend/src/features/documents/hooks/use-update-document-pin.ts`
- upload UI components under `frontend/src/features/documents`

Acceptance criteria:

- Frontend requests a presigned URL from `POST /documents/presigned-url`.
- Frontend uploads to storage successfully.
- Frontend calls `POST /documents/cosaf-upload-complete` after upload completion.
- Upload failures and partial completions show actionable UI feedback.

#### Story: ORP-P2-02 Add COSAF document status progress UI

Targets:

- `frontend/src/features/cosaf`
- `frontend/src/features/documents`

Acceptance criteria:

- UI shows upload requested, upload in progress, upload completed, and approval-ready states.
- Users get explicit success and failure feedback for each transition.
- UI handles retryable failures without page reload dependence.
- Progress state is aligned with backend status transitions.

#### Story: ORP-P2-03 Scope pending approvals by reviewing BM

Targets:

- `backend/src/services/cosaf-approvals.service.ts`
- `backend/src/routes/cosaf-approvals.routes.ts`

Acceptance criteria:

- Approval listing and actions are scoped by `reviewingBmId`.
- BM cannot see or act on approvals assigned to other BMs unless explicitly allowed.
- Query behavior is tested for scoped and unscoped access.
- Audit logs record approval decisions with reviewing BM context.

#### Story: ORP-P2-04 Surface BM import and reassign in navigation

Targets:

- `frontend/src/features/navigation/config/navigation.ts`
- related BM dashboard or quick-action components

Acceptance criteria:

- BM navigation exposes import and reassignment entry points.
- Links are role-gated and hidden from unauthorized users.
- Quick actions reduce clicks to the most common BM workflows.
- Navigation labels match operational terminology.

#### Story: ORP-P2-05 Add workflow smoke test for COSAF upload-to-approval

Targets:

- backend/frontend e2e or integration test locations

Acceptance criteria:

- Test covers presigned URL request, upload-complete callback, queue population, and approval visibility.
- Test fails if upload-complete bridge does not populate pending approvals.
- Test is part of pre-release critical-path checks.

## Phase 3 - Reassignment and Queue UX Modernization

### Epic: ORP-P3 Reassignment and Queue UX

Success metric: Reassignment no longer depends on raw UUID entry, validates conflicts before submit, and exposes async operation outcomes across roles.

#### Story: ORP-P3-01 Replace UUID-only reassignment with lookup selectors

Targets:

- `frontend/src/features/cosaf/components/client-reassignment-form.tsx`
- `frontend/src/features/cosaf/components/reassign-page-client.tsx`
- search/list APIs as needed in backend services and routes

Acceptance criteria:

- BM can search and select agents and client profiles from lookup controls.
- Form supports multi-select client reassignment.
- Current page-1-only preload limitation is removed.
- Manual UUID entry is no longer required in the happy path.

#### Story: ORP-P3-02 Add reassignment preflight validation

Targets:

- frontend reassignment form and validation layer
- backend reassignment service and route handlers

Acceptance criteria:

- System blocks submissions with missing IDs, ownership mismatch, or destination conflicts.
- Validation errors are specific and actionable.
- Backend re-validates all critical preflight checks server-side.
- Conflicting requests are audited when applicable.

#### Story: ORP-P3-03 Add async job status surfaces

Targets:

- `frontend/src/features/admin`
- `frontend/src/features/cosaf`
- `frontend/src/features/agents`
- backend job status endpoints or service layer as needed

Acceptance criteria:

- Admin, BM, and Agent views expose recent imports, notifications, and async processing outcomes.
- Status surfaces distinguish queued, processing, succeeded, and failed states.
- Users can identify failed operations without checking logs directly.
- Retry entry points are exposed only where authorized.

## Phase 4 - Agent Productivity Surface

### Epic: ORP-P4 Agent Operations Surface

Success metric: Agent has a single role-appropriate operations page that shows assigned work, actionable statuses, return reasons, and recent notifications.

#### Story: ORP-P4-01 Build dedicated Agent Operations page

Targets:

- current agent dashboard page under `frontend/src/app/dashboard/agents/[id]/page.tsx`
- `frontend/src/features/agents`
- `legacy-client/src/pages/AgentWorkflow.tsx` as reference only

Acceptance criteria:

- Page shows assigned clients queue, case status actions, return reasons, and recent timeline activity.
- Page is role-gated for agents.
- Data loading handles empty, loading, and failure states clearly.
- Legacy placeholder is no longer the de facto agent workflow reference.

#### Story: ORP-P4-02 Improve agent route discoverability

Targets:

- `frontend/src/features/navigation/config/navigation.ts`
- agent-specific dashboard or profile entry points

Acceptance criteria:

- Agent navigation includes a clear route to the operations page.
- Entry is visible only to appropriate users.
- Dashboard or landing experience highlights current work requiring action.

#### Story: ORP-P4-03 Add action-now widgets for role-specific work

Targets:

- `frontend/src/features/admin`
- `frontend/src/features/cosaf`
- `frontend/src/features/agents`

Acceptance criteria:

- Each role sees widgets summarizing items that require immediate action.
- Widgets are based on real workflow states, not static placeholders.
- Widget counts reconcile with underlying queue/list views.

## Phase 5 - Speed and Scale Improvement

### Epic: ORP-P5 Speed and Scale

Success metric: High-volume endpoints and dashboards meet agreed latency targets under realistic load, and worker backlog remains within threshold during peak operations.

#### Story: ORP-P5-01 Convert high-volume lists to cursor pagination

Targets:

- list endpoints for client profiles, approvals, lapsation, and notification logs
- corresponding frontend list consumers

Acceptance criteria:

- High-volume lists support cursor/keyset pagination where stable ordering exists.
- API responses include cursor metadata for next-page fetches.
- Frontend list views use the new pagination model without data loss or duplicate rows.
- Legacy page-number behavior is retained only where technically necessary and documented.

#### Story: ORP-P5-02 Push metrics aggregation into SQL

Targets:

- `backend/src/services/metrics.service.ts`

Acceptance criteria:

- Heavy leaderboard and dashboard aggregations are executed with SQL `GROUP BY` and bounded result windows.
- API no longer performs expensive in-memory aggregation on large result sets.
- Query plans and latency measurements are recorded before and after change.

#### Story: ORP-P5-03 Optimize search strategy and indexing

Targets:

- client profile search queries and related schema/index migrations

Acceptance criteria:

- Search avoids broad unindexed `%term%` scans on critical paths.
- Query-specific indexes are added for dominant search patterns.
- Search behavior and relevance remain acceptable for operators.
- Index rollout includes migration and rollback notes.

#### Story: ORP-P5-04 Batch scanner and import DB updates

Targets:

- `backend/src/jobs/at-risk-scanner.job.ts`
- `backend/src/services/performance-import.service.ts`

Acceptance criteria:

- Scanner and import paths reduce avoidable N+1 writes.
- Batch operations preserve auditability and failure visibility.
- Throughput improvement is measured against baseline.

#### Story: ORP-P5-05 Add API and queue observability

Targets:

- API middleware and queue instrumentation locations
- worker metrics exposure points

Acceptance criteria:

- Team can inspect p95 API latency, queue lag, and worker throughput.
- Metrics can be checked during release validation.
- Alert thresholds or manual watch thresholds are documented.

## Phase 6 - Reliability, Testing, and Release Controls

### Epic: ORP-P6 Reliability and Release Controls

Success metric: Critical role paths are protected by automated tests, release gates are explicit, and rollback decisions can be made quickly with observable health data.

#### Story: ORP-P6-01 Add Admin e2e suite

Acceptance criteria:

- Suite covers user lifecycle, notification control surfaces, and document access governance.
- Tests include audit assertions for sensitive actions.

#### Story: ORP-P6-02 Add BM e2e suite

Acceptance criteria:

- Suite covers COSAF document upload-to-approval and reassignment operations.
- Tests include scoped approval queue behavior.

#### Story: ORP-P6-03 Add Agent e2e suite

Acceptance criteria:

- Suite covers assigned queue, case status actions, returned case visibility, and recent notifications.
- Tests reflect the dedicated Agent Operations page.

#### Story: ORP-P6-04 Add integration tests for transitions and audit logs

Acceptance criteria:

- Tests cover critical status transitions across COSAF, documents, reassignment, and notifications.
- Audit payloads are asserted for actor, target, action, and timestamp semantics.

#### Story: ORP-P6-05 Add release checklist and smoke-test gate

Acceptance criteria:

- Release process includes diagnostics check, critical-path smoke tests, and rollback checkpoint.
- Checklist is stored in-repo and used before each deployment.

## Cross-Cutting Definition of Done

- Admin can create, edit, archive, restore, and reset users safely.
- Branch Manager can complete COSAF upload-to-approval and reassign clients through supported UI flows.
- Agent has a clear queue and can act on returned cases with visibility into notifications.
- Major list endpoints and dashboard views meet agreed latency targets.
- Worker backlog and queue health are observable before and after release.
