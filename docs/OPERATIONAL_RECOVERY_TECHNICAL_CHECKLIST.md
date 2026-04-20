# Operational Recovery Technical Checklist

This checklist translates the recovery plan into concrete engineering work areas by backend, frontend, data, worker, and testing surfaces.

## Phase 0 - Operational Baseline

### Backend and Worker

- Add an internal diagnostics route in the backend app bootstrap that reports API readiness, queue connectivity, worker heartbeat freshness, and migration guard status.
- Define a worker heartbeat write/update mechanism in `backend/src/jobs/worker.ts`.
- Add queue health helper(s) in `backend/src/shared/lib/queue.ts` for ping/readiness checks and lag summaries.
- Ensure diagnostics degrade gracefully when Redis or worker dependencies are unavailable.

### Data and Migration Layer

- Add migration validation for required workflow statuses and constraints under `backend/src/shared/db/migrations`.
- Expose migration validation through a callable script or startup check.
- Document expected migration order and failure recovery path.

### Documentation and Runbook

- Update `README.md` with API, frontend, worker, DB, and migration commands.
- Add a local ops runbook that names healthy outputs and common failure symptoms.
- Link the runbook from the root recovery execution pack.

### Tests

- Add smoke coverage for diagnostics endpoint and degraded queue/worker state handling.

## Phase 1 - Access and Governance Hardening

### Backend Routes and Services

- Extend `backend/src/routes/users.routes.ts` with:
  - `PATCH /users/:id`
  - `POST /users/:id/restore`
  - `POST /users/:id/reset-password`
- Extend `backend/src/services/users.service.ts` with edit, restore, and reset-password service methods.
- Add explicit self-delete protection in `backend/src/services/users.service.ts`.
- Review authorization middleware usage in:
  - `backend/src/routes/users.routes.ts`
  - `backend/src/routes/documents.routes.ts`
  - `backend/src/routes/notifications.routes.ts`

### Shared Contracts

- Add or update request/response schemas for user edit, restore, and reset-password flows.
- Standardize error payloads for forbidden, invalid-transition, and self-delete cases.

### Frontend Admin Surface

- Add user edit modal/form under `frontend/src/features/admin/components`.
- Add restore action in user list/details UI.
- Add reset-password action with confirm state and result feedback.
- Ensure archived and restored states are visible in user-management lists.

### Audit and Security

- Define required audit fields for user lifecycle events:
  - actor ID
  - target user ID
  - action type
  - previous state
  - next state or requested mutation
- Confirm reset-password events do not expose secrets or raw tokens.

### Tests

- Add integration tests for:
  - admin edit user
  - admin restore user
  - admin reset-password
  - self-delete rejection
- Add authorization tests for forbidden roles across users, documents, and notifications routes.

## Phase 2 - BM COSAF + Documents Workflow

### Backend Documents Lifecycle

- Confirm `backend/src/routes/documents.routes.ts` exposes:
  - `POST /documents/presigned-url`
  - `POST /documents/cosaf-upload-complete`
- Verify `backend/src/services/documents.service.ts` persists upload completion and transition state correctly.
- Ensure upload-complete flow populates downstream approval visibility without manual repair.

### Frontend Documents and COSAF

- Add upload initiation hook/mutation for presigned URL retrieval.
- Add storage upload client handling with progress and failure states.
- Add upload-complete mutation call after storage success.
- Extend `frontend/src/features/documents/hooks/use-get-documents.ts` consumers to reflect upload lifecycle state.
- Add explicit transition feedback in COSAF views for pending, uploaded, returned, and approval-ready states.

### Approval Scoping

- Update `backend/src/services/cosaf-approvals.service.ts` to scope queue queries and actions by `reviewingBmId`.
- Verify route/controller layer forwards reviewing BM context correctly.
- Add tests for:
  - own-queue visibility
  - cross-BM isolation
  - authorized override behavior if intentionally supported

### Navigation and Discoverability

- Add BM import and reassignment entries to `frontend/src/features/navigation/config/navigation.ts`.
- Add BM quick actions on landing/dashboard surfaces.

### Tests

- Add end-to-end coverage for upload request, file upload completion callback, queue appearance, and approval action.

## Phase 3 - Reassignment and Queue UX Modernization

### Frontend Reassignment UX

- Replace manual UUID-only fields in `frontend/src/features/cosaf/components/client-reassignment-form.tsx`.
- Remove page-1-only preload dependence in `frontend/src/features/cosaf/components/reassign-page-client.tsx`.
- Add searchable selectors for:
  - destination agent
  - source client profile(s)
  - optionally current owner/filter state
- Add multi-select or batch action capability.

### Backend Validation

- Enforce reassignment preflight validation for:
  - missing IDs
  - invalid profile ownership
  - destination conflict
  - already completed or incompatible case states
- Return structured validation errors that map cleanly to UI messages.

### Async Outcome Visibility

- Add job-status or activity-status endpoints/service calls for imports, notifications, reassignment jobs, and async workflows.
- Surface queued/processing/succeeded/failed states in admin, BM, and agent-facing pages.
- Add retry affordances only where authorization permits.

### Tests

- Add frontend and integration coverage for valid reassignment, conflict rejection, and async status presentation.

## Phase 4 - Agent Productivity Surface

### Frontend Agent Operations

- Build a dedicated Agent Operations experience around the current route at `frontend/src/app/dashboard/agents/[id]/page.tsx`.
- Use `legacy-client/src/pages/AgentWorkflow.tsx` only as a reference for previous intent, not as the implementation target.
- Add sections for:
  - assigned clients queue
  - case status actions
  - returned cases and return reasons
  - recent notifications or operational timeline

### Navigation

- Add a clear agent-facing nav entry in `frontend/src/features/navigation/config/navigation.ts`.
- Ensure agent users land somewhere that clearly states what requires action now.

### Backend/Contracts

- Confirm agent-facing APIs expose data needed for:
  - assigned work queue
  - return reason visibility
  - notification timeline
- Revisit `backend/src/routes/client-profiles.routes.ts` if reassignment or related actions need revised role boundaries.

### Tests

- Add role-focused tests for agent queue, status updates, returned-case visibility, and timeline rendering.

## Phase 5 - Speed and Scale Improvements

### Lists and Pagination

- Inventory high-volume list endpoints and define stable sort keys.
- Implement cursor/keyset pagination where row ordering can be guaranteed.
- Update frontend list consumers to request next cursors instead of page numbers.

### Metrics and Aggregation

- Review `backend/src/services/metrics.service.ts` for in-memory aggregation and ranking logic.
- Push heavy aggregation into SQL `GROUP BY`, filtered windows, and bounded result sets.
- Measure before/after latency and query behavior.

### Search and Indexing

- Identify dominant search predicates for client profiles and approvals.
- Replace broad `%term%` matching on hot paths with indexed strategies where possible.
- Add query-specific indexes through the migration layer and document rollback implications.

### Import and Scanner Throughput

- Review write patterns in `backend/src/jobs/at-risk-scanner.job.ts`.
- Review write patterns in `backend/src/services/performance-import.service.ts`.
- Batch updates where safe and preserve visibility into partial failure handling.

### Observability

- Add API latency instrumentation.
- Add queue lag and worker throughput instrumentation.
- Define target thresholds for p95 latency and acceptable backlog depth.

### Tests and Validation

- Add performance validation scripts or repeatable measurement steps for top endpoints.
- Verify pagination and search changes do not regress operator-visible behavior.

## Phase 6 - Reliability, Testing, and Release Controls

### End-to-End Suites

- Add Admin e2e coverage for user lifecycle and notification controls.
- Add BM e2e coverage for COSAF upload-to-approval and reassignment.
- Add Agent e2e coverage for daily operational flows.

### Integration Tests

- Cover critical state transitions and audit log production for:
  - users
  - documents
  - COSAF approvals
  - reassignment
  - notifications

### Release Controls

- Publish a release checklist that includes:
  - diagnostics endpoint healthy
  - critical-path smoke suite pass
  - migration validation pass
  - queue lag within threshold
  - rollback owner identified
- Add post-release verification steps for Admin, BM, and Agent role paths.

## Required Supporting Artifacts

- Route authorization matrix for users, documents, notifications, client profile actions, and approvals.
- Status transition matrix for document lifecycle, COSAF lifecycle, reassignment eligibility, and notification retries.
- Audit event catalog for sensitive actions and operational workflows.
- Service-level objectives for top operator-facing endpoints and worker backlog.
