# Operational Recovery Risk Matrix

This matrix highlights the main risks, dependencies, and rollback considerations for the recovery program.

| ID | Risk | Phases | Likelihood | Impact | Early warning signal | Mitigation | Rollback / containment |
|---|---|---|---|---|---|---|---|
| R1 | Authorization drift while adding user lifecycle endpoints exposes actions to wrong roles | 1 | Medium | High | Inconsistent route guards, UI actions visible to unauthorized users | Freeze and document a route authorization matrix before merging endpoint work; add forbidden-path tests | Disable UI entry points and revert route registrations for new actions |
| R2 | Reset-password flow leaks sensitive data or bypasses approved identity process | 1 | Medium | High | Raw tokens or detailed identity errors appear in logs or API responses | Route through approved identity flow only; redact logs; add security review checkpoint | Disable reset-password UI action and feature-flag endpoint if needed |
| R3 | Self-delete protection is missed in one code path, allowing accidental lockout | 1 | Low | High | Admin account lifecycle changes originate from same actor/target user ID | Centralize self-delete guard in service layer; test all archive paths | Restore affected account manually and patch service guard before redeploy |
| R4 | Document upload UI is wired partially, leaving orphaned uploads or untracked COSAF states | 2 | Medium | High | Storage uploads succeed but approvals do not populate | Treat upload lifecycle as one workflow; require upload-complete callback and smoke test the bridge | Hide upload UI or gate feature while fallback manual handling is used |
| R5 | Approval scoping by `reviewingBmId` breaks existing BM queues due to missing assignment data | 2 | Medium | High | BM pending queue appears empty after scoping change | Audit existing assignment data and define fallback behavior before enforcing strict filters | Temporarily support legacy unscoped fallback behind admin-only or feature-flagged path |
| R6 | Reassignment UX changes introduce new validation failures and slow down operators | 3 | Medium | Medium | Increased failed submissions or longer reassignment completion time | Pair new selectors with server-side validation and clear error messaging; keep batch flow simple | Temporarily retain manual input fallback for admin/BM support users |
| R7 | Async job status surfaces increase confusion if statuses are stale or incomplete | 3 | Medium | Medium | Users see jobs stuck in queued/processing with no terminal updates | Define status model carefully and capture terminal events from workers/services | Hide unreliable status tiles until event capture is corrected |
| R8 | Agent Operations page duplicates or conflicts with existing shared views | 4 | Medium | Medium | Agents navigate between two inconsistent sources of truth | Make new operations page the primary entry and consolidate widgets with shared services | Route agents back to existing stable page while preserving backend changes |
| R9 | Cursor pagination rollout causes missing/duplicated records in high-volume lists | 5 | Medium | High | Users report missing rows or repeated rows when paginating | Choose stable sort keys, add pagination tests, and validate against sample datasets | Revert affected endpoint to page-based pagination while keeping indexes/metrics work |
| R10 | Search/index changes improve latency but degrade operator search quality | 5 | Medium | Medium | Users cannot find known records with typical search terms | Measure current search behavior, preserve dominant queries, and validate with operator examples | Revert query path while retaining safe indexes |
| R11 | Batch import/scanner changes improve throughput but reduce audit fidelity or partial-failure visibility | 5 | Medium | High | Bulk jobs complete faster but operators cannot explain individual record failures | Add batch-level and record-level summary logging before optimization | Re-enable slower per-record path for affected job until observability is restored |
| R12 | Observability work is postponed, making performance releases hard to validate | 5, 6 | Medium | High | Team cannot confirm p95 latency, queue lag, or worker throughput during rollout | Make minimal metrics instrumentation part of Phase 5 entry criteria | Delay performance release and ship only workflow-safe changes |
| R13 | E2E suites arrive too late to protect critical refactors | 2, 3, 4, 6 | High | High | Regressions are found manually after merge | Pull smoke tests forward; add critical-path coverage before Phase 2 completes | Pause further feature rollout until smoke coverage is restored |
| R14 | Migration guards block startup unexpectedly in shared environments | 0 | Low | Medium | Healthy environments start failing after guard release | Ship guard in report-only mode first where necessary, then enforce after validation | Toggle to warning-only mode and document remediation steps |
| R15 | Release coordination fails because API, worker, and frontend deploy out of sequence | 0-6 | Medium | High | Partial features appear in UI before backend or worker support is live | Release by workflow, not by layer; define milestone gates and compatible rollout order | Roll back UI entry points or API route exposure to last compatible state |

## Key Dependencies

- Worker heartbeat depends on a stable mechanism for writing liveness state from `backend/src/jobs/worker.ts`.
- Diagnostics endpoint depends on queue health helpers and migration validation output.
- User lifecycle UI depends on backend endpoints, shared validation, and audit logging consistency.
- BM document workflow depends on presigned upload flow, storage callback completion, and approval queue linkage.
- Approval scoping depends on trustworthy `reviewingBmId` assignment and historical data consistency.
- Reassignment modernization depends on searchable lookup APIs that scale past the current preload pattern.
- Agent Operations page depends on APIs surfacing assigned work, return reasons, and timeline activity.
- Performance optimization depends on observability being present before and after changes.

## Decision Gates

- Gate A: Do not start Phase 2 until Phase 1 authorization matrix and user lifecycle smoke tests are approved.
- Gate B: Do not cut BM workflow release until upload-to-approval smoke test passes in an environment with worker and queue enabled.
- Gate C: Do not start deep Phase 5 optimization until role-critical workflows are stable and observable.
- Gate D: Do not release broad pagination/search changes without before/after measurements and operator validation samples.
