# Operational Recovery Release Plan

This release plan defines milestones, gates, smoke tests, and rollout order for the operational recovery program.

## Milestone Sequence

### Milestone 1 - Baseline and Governance

Scope:

- Phase 0
- Phase 1
- minimal role-critical smoke coverage

Exit criteria:

- Diagnostics endpoint reports API, worker, queue, and migration state.
- Local/shared runbook is published in repo.
- Admin can edit, restore, and reset-password users.
- Self-delete protection is enforced.
- Route authorization matrix for users, documents, and notifications is approved.
- Smoke tests cover new user lifecycle actions and forbidden paths.

Recommended rollout order:

1. Ship migration guards and diagnostics in report-safe form if needed.
2. Ship user lifecycle backend endpoints and tests.
3. Ship admin UI actions after backend protections are verified.

### Milestone 2 - BM Workflow Completion

Scope:

- Phase 2
- BM-focused slice of Phase 3 that is required to unblock real operations

Exit criteria:

- BM can upload COSAF documents end-to-end through supported UI.
- Upload-complete bridge populates pending approvals reliably.
- Approval queue is scoped by reviewing BM.
- BM navigation exposes import and reassignment.
- Critical BM smoke tests pass.

Recommended rollout order:

1. Ship backend upload lifecycle and approval scoping.
2. Ship frontend upload/status UI.
3. Ship BM nav and quick actions.
4. Verify queue population and approval actions in an environment with worker enabled.

### Milestone 3 - Reassignment and Agent Usability

Scope:

- remainder of Phase 3
- Phase 4

Exit criteria:

- Reassignment uses lookup selectors and batch-friendly UI.
- Preflight validation blocks invalid submissions clearly.
- Async job outcomes are visible to the right roles.
- Agent Operations page is the primary role surface for agents.
- Role-specific "what needs action now" widgets are live.

Recommended rollout order:

1. Ship backend validation and lookup support.
2. Ship reassignment UI refresh.
3. Ship async status surfaces.
4. Ship Agent Operations page and route discoverability.

### Milestone 4 - Scale and Release Safety

Scope:

- Phase 5
- Phase 6

Exit criteria:

- Top endpoints meet agreed latency targets or documented interim thresholds.
- Queue lag and worker throughput are observable.
- Cursor pagination/search changes are validated against production-like data patterns.
- Admin, BM, and Agent e2e suites exist.
- Release checklist and rollback checkpoints are in active use.

Recommended rollout order:

1. Ship observability and measurement first.
2. Ship low-risk SQL aggregation/index improvements.
3. Ship pagination/search changes in guarded slices.
4. Ship batch write optimizations.
5. Lock release checklist and e2e gates before broad rollout.

## Release Gates

### Gate 1 - Pre-Merge

- Acceptance criteria for the story are mapped to tests or manual verification notes.
- Authorization and audit impacts are explicitly reviewed for user, document, notification, approval, and reassignment changes.
- Any migration includes rollback notes.

### Gate 2 - Pre-Deploy

- Diagnostics endpoint is healthy.
- Worker heartbeat is fresh.
- Queue connectivity is confirmed.
- Migration guard passes.
- No unresolved severity-1 workflow regressions exist.

### Gate 3 - Post-Deploy Smoke

- Admin critical path passes.
- BM critical path passes if affected by the release.
- Agent critical path passes if affected by the release.
- Queue lag remains within threshold after release traffic begins.

### Gate 4 - Stabilization

- Error logs are reviewed for authorization, transition, upload, and job-processing anomalies.
- Latency and worker throughput are compared against baseline when relevant.
- Rollback decision owner signs off within the agreed monitoring window.

## Critical Smoke Tests

### Admin

- Login and reach admin user-management view.
- Edit a user role/name successfully.
- Attempt self-delete and confirm rejection.
- Restore an archived user successfully.
- Trigger reset-password and confirm safe response behavior.
- Open notification logs and verify any new controls still respect role boundaries.

### Branch Manager

- Open BM navigation and access import/reassign entries.
- Start document upload and receive presigned URL.
- Complete storage upload and submit upload-complete callback.
- Confirm pending approval appears in the correct BM queue.
- Approve or reject and verify audit/log side effects.
- Reassign clients through selector-based flow and verify success or clear preflight errors.

### Agent

- Open Agent Operations page from navigation.
- Confirm assigned queue is visible.
- Open a returned case and see return reason.
- Perform a role-allowed case status action.
- Confirm recent notifications/timeline is visible.

### Platform

- Diagnostics endpoint reports healthy or expected degraded state.
- Worker heartbeat timestamp updates.
- Queue lag is within threshold.
- High-volume list endpoint under change returns correct pagination behavior.

## Rollback Principles

- Roll back by workflow boundary when possible, not by individual file.
- If frontend UI ships ahead of backend support, hide the entry point first.
- If backend route behavior regresses authorization, disable the route or restore previous guard configuration.
- If worker-dependent workflows fail, stop exposing the affected UI until queue/worker health is restored.
- If performance changes cause missing or duplicated records, revert endpoint behavior before reverting safe observability/index additions.

## Ownership Recommendations

- Backend lead: diagnostics, user lifecycle APIs, approval scoping, validation, observability.
- Frontend lead: admin lifecycle UI, BM upload/reassign UX, Agent Operations page, navigation updates.
- Platform/DB lead: migration guard, indexing, pagination strategy review, release checklist ownership.
- QA or release owner: smoke suite curation, milestone signoff, rollback coordination.
