# Plan V2

## PRU Life UK — A1 Prime Branch (Drea Branch)

---

## Purpose

This document is the revised master plan for finishing the system.

It is built from:

- the original branch requirements
- the older implementation plans and audits in `docs/`
- the operational recovery documents
- the current codebase state
- the latest UI and performance findings

This is not a pure UI plan.

This is the system-finish plan.

Its job is to answer four questions clearly:

1. what is already truly implemented
2. what is only partial or risky
3. what is still missing before the system can be considered finished
4. what order we should follow to finish it safely and fast

---

## Planning Mode

This plan treats the project as one delivery program with six connected surfaces:

- product requirements
- backend correctness
- frontend usability
- data and local environment readiness
- operational reliability
- manager presentation readiness

If a backend change is needed to complete a workflow, that change is in scope.

If a UI change makes the system prettier but less reliable, it is out of scope until the workflow is stable.

---

## Source Synthesis

This plan consolidates the intent and constraints found across:

- `docs/ANTIGRAVITY_PROMPT.md`
- `docs/FUNCTIONAL_IMPLEMENTATION_PLAN.md`
- `docs/CORE_MODULES_CHECKLIST.md`
- `docs/OPERATIONAL_ENGINE_CHECKLIST.md`
- `docs/CODEBASE_AUDIT_REPORT.md`
- `docs/CORRECTED_CODEBASE_AUDIT.md`
- `docs/OPERATIONAL_RECOVERY_EXECUTION_PACK.md`
- `docs/OPERATIONAL_RECOVERY_JIRA_BACKLOG.md`
- `docs/OPERATIONAL_RECOVERY_RELEASE_PLAN.md`
- `docs/OPERATIONAL_RECOVERY_RISK_MATRIX.md`
- `docs/OPERATIONAL_RECOVERY_TECHNICAL_CHECKLIST.md`
- `docs/AUTHORIZATION_ROUTE_MATRIX.md`
- `docs/ui-planning.md`
- `docs/phase-0-baseline-check.md`
- `docs/requirements-alignment-review.md`

---

## Non-Negotiable Rules

### Rule 1: Local Database Support Must Stay

The system must continue to support local PostgreSQL and pgAdmin workflows.

The branch must not become Supabase-only.

### Rule 2: Fix Truth Before Cosmetics

We do not treat visual polish as completion if:

- data is wrong
- status flow is wrong
- uploads are not tracked correctly
- permissions are inconsistent
- notifications are not proven
- pages are too slow to use

### Rule 3: Early COSAF Scope Lock

In early phases, COSAF is protected from broad redesign.

Allowed early COSAF work:

- bug fixes
- requirement-critical fixes
- upload/approval status fixes
- audit and notification fixes
- clearer loading and error behavior

Not allowed early:

- broad layout redesign
- decorative refactors
- risky restructuring

### Rule 4: Shared Wins Come First

Work that improves many modules at once should be prioritized:

- login path
- shell and sidebar
- route responsiveness
- loading and error patterns
- auth/session behavior
- data refetch discipline

### Rule 5: Role-Based Safety Must Remain Intact

Every phase must preserve:

- Admin-only actions staying Admin-only
- BM-scoped actions staying branch-scoped
- Agent-only data visibility staying limited to owned records

---

## What “Finished System” Means

The system is not finished because the modules exist.

The system is finished when all of these are true:

- orphan client reassignment works end-to-end
- COSAF upload, approval, return, and signed-copy flow works end-to-end
- notifications for key events are operationally proven
- lapsation monitoring works with local data and is understandable to users
- performance views are usable, sufficiently accurate, and not demo-risky
- document repository works as a governed branch library
- Admin, BM, and Agent each have a clear usable flow
- local startup, migration, and demo data preparation are documented and dependable
- the dashboard feels responsive enough to present confidently
- known limitations are few, controlled, and explicitly documented

---

## Current Verified State

## Strongly Implemented

- role-based navigation exists
- Admin, BM, and Agent home surfaces exist
- COSAF workflow foundation exists
- COSAF approval endpoint exists
- COSAF rejection endpoint exists with mandatory reason validation
- signed-copy upload flow exists
- document repository exists
- document archive and version behavior exists in code
- pinning, metadata editing, search, and history exist in the document library
- audit logging exists across multiple workflows
- notification log views exist
- lapsation service exists
- at-risk threshold logic exists
- reinstatement logic exists
- performance and metrics surfaces exist

## Implemented But Still Needing Proof

- Gmail-driven workflow notifications
- agent reassignment notifications
- live end-to-end COSAF transitions
- lapsation import quality with real local data
- branch-wide leaderboard confidence
- monthly filter behavior in all performance surfaces
- worker and queue behavior in a full local run

## Still Weak Or Risky

- frontend cold start and initial route readiness
- performance route responsiveness
- some dashboard pages still leaning on heavy loading states
- incomplete live verification across all critical journeys
- unclear final “done” checklist per role

---

## Requirement Reality Check

### COSAF and Orphan Client Module

Current reality:

- foundation is strong
- requirement coverage is the most advanced here
- this is also the highest-risk workflow to break

Verified or close:

- batch reassignment
- approval queue
- rejection with reason
- signed-copy handling
- audit trail foundation

Still needs finish-level confirmation:

- resignation-to-orphan automation behavior
- live upload-to-approval-to-signed-copy walk
- reliable notification proof
- user-facing clarity of all status stages

### Lapsation Monitoring Module

Current reality:

- backend logic exists
- UI surfaces exist
- requirement fit looks decent in code
- verification and presentation quality are not done yet

Needs more proof:

- real import behavior
- at-risk and lapsed distinctions in live use
- agent/BM/Admin understanding of the output
- route performance and clarity

### Performance Tracker Module

Current reality:

- structure exists
- dashboards and leaderboards exist
- this module is less trustworthy than COSAF or documents right now

Risk areas:

- route slowness
- confidence in displayed metrics
- proving monthly filtering and comparative views

### Document Repository Module

Current reality:

- one of the strongest modules in the codebase
- category structure, access control, archive/version behavior, and quick links are present

Needs final proof:

- live upload and versioning path
- clear manager demo of archive/history/governance

### Notification System

Current reality:

- queue and log architecture exist
- admin visibility exists
- operational proof is still incomplete

Still needed:

- confirm real send path locally or in demo-safe environment
- verify content usefulness of messages

---

## System Completion Strategy

This plan uses eight phases.

Each phase has one job.

No phase should try to solve everything at once.

---

## Phase 0 — Control the Scope and Freeze the Truth

Primary outcome:

- know exactly what the system is, what it is not, and what must be finished first

Checklist:

- [ ] turn the requirement review into a tracked execution checklist
- [ ] mark every major requirement as `Done`, `Partial`, `Needs Proof`, or `Open`
- [ ] create one live blocker list for demo-critical issues
- [ ] define which features can be deferred without harming the manager presentation
- [ ] freeze broad COSAF redesign
- [ ] define the single source of truth docs for the team

Exit condition:

- the team stops debating scope and starts closing tracked gaps

---

## Phase 1 — Shared Stability, Login, Shell, and Sidebar

Primary outcome:

- the app feels usable and stable before deeper feature completion work

Checklist:

- [ ] reduce login page delay
- [ ] reduce dashboard shell delay
- [ ] keep shell visible while module content loads
- [ ] reduce route-switch friction
- [ ] reduce unnecessary prefetching
- [ ] reduce repeated refetching where it harms responsiveness
- [ ] replace unclear heavy loading states with clearer progressive states
- [ ] keep real errors visible instead of hiding them behind spinners

Sidebar checklist:

- [ ] make collapsed sidebar a true slim rail
- [ ] remove wasted collapsed width
- [ ] keep icons centered and legible
- [ ] align logo and menu trigger cleanly
- [ ] allow main content to reclaim space correctly
- [ ] keep navigation understandable in collapsed mode

COSAF rule:

- only bug fixes or shared performance-related fixes in this phase

Exit condition:

- moving through the system feels less fragile

---

## Phase 2 — Operational Baseline and Environment Readiness

Primary outcome:

- the system can be started, checked, and demoed locally without guesswork

Checklist:

- [ ] confirm local runbook accuracy for frontend, backend, DB, and worker
- [ ] verify migration order and required migration set
- [ ] define healthy startup checks for API, frontend, worker, queue, and DB
- [ ] confirm role test accounts and demo data setup
- [ ] document environment dependencies for Gmail, storage, Redis, and local fallback behavior
- [ ] define what “good enough for local demo” means when integrations are degraded

Exit condition:

- the team can reliably bring up the system and know whether it is healthy

---

## Phase 3 — Finish Non-COSAF Requirement Gaps

Primary outcome:

- improve the modules around COSAF so the whole product feels more complete

Checklist:

- [ ] verify document repository upload, archive, history, metadata, and pin flow live
- [ ] verify notification logs usefulness for Admin
- [ ] verify lapsation role visibility and reinstatement behavior
- [ ] verify performance metrics and leaderboard pages at a feature level
- [ ] close any non-COSAF requirement gaps that are clearly open
- [ ] reduce obvious non-COSAF presentation weaknesses

Exit condition:

- documents, notifications, lapsation, and performance are closer to requirement-complete

---

## Phase 4 — COSAF Reliability and Requirement Closure

Primary outcome:

- COSAF becomes a dependable end-to-end workflow

Checklist:

- [ ] verify delist/resignation-to-orphan behavior
- [ ] verify orphan queue and reassignment behavior
- [ ] verify agent upload path for forms and required documents
- [ ] verify case status transitions across all required stages
- [ ] verify approval path for Admin and BM
- [ ] verify return path with visible reason for correction
- [ ] verify signed-copy return path
- [ ] verify audit trail visibility at the user-facing level where needed
- [ ] verify notification path for reassignment, return, and signed-copy events
- [ ] tighten COSAF loading/error states without redesigning the workflow

Exit condition:

- COSAF can be demonstrated from start to finish with confidence

---

## Phase 5 — Data Confidence, Performance, and Slow Routes

Primary outcome:

- the numbers and the speed are good enough to trust during presentation

Checklist:

- [ ] remeasure login, dashboard, and major route timings
- [ ] isolate the slowest page queries and remove the biggest blockers
- [ ] stabilize the performance leaderboard route
- [ ] stabilize the lapsation route
- [ ] preserve visible content during background refetches where safe
- [ ] verify that charts, rankings, and counts match expected local data samples
- [ ] document any remaining performance limitations honestly

Exit condition:

- the slowest pages are no longer high-risk during a live walkthrough

---

## Phase 6 — Role Experience and Workflow Clarity

Primary outcome:

- each role has a coherent usable path through the system

Checklist:

- [ ] tighten Admin quick actions and governance journey
- [ ] tighten BM approval, branch filtering, and orphan control journey
- [ ] tighten Agent task-first workflow across clients, COSAF, at-risk policies, and prospects
- [ ] improve microcopy, empty states, and confirmation states for role-critical tasks
- [ ] remove obvious confusion between route labels and actual task intent

Exit condition:

- Admin, BM, and Agent all have understandable flows with fewer dead ends

---

## Phase 7 — UI Consistency and Presentation Polish

Primary outcome:

- the system looks deliberate and manager-ready without destabilizing workflows

Checklist:

- [ ] standardize spacing and hierarchy across major pages
- [ ] improve top-level dashboard polish
- [ ] improve high-visibility page headers and summary blocks
- [ ] refine document area presentation
- [ ] refine role-home visual consistency
- [ ] validate accessibility basics for critical screens

Guardrail:

- no late risky redesign of working flows

Exit condition:

- the system looks more complete, not just more decorated

---

## Phase 8 — Final Requirement Review and Presentation Lock

Primary outcome:

- close the delivery loop and know exactly what can be claimed

Checklist:

- [ ] run final requirement-by-requirement review
- [ ] mark each requirement as `Done`, `Partial`, or `Deferred`
- [ ] run role-based smoke tests
- [ ] run one guided manager-demo path for Admin, BM, and Agent
- [ ] create final known-issues list
- [ ] prepare the honest presentation summary: what works, what is partial, what is next

Exit condition:

- the team can present with confidence and accuracy

---

## What We Can Already Lean On

These are the strongest assets in the current branch:

- shared schema architecture
- role-based routing and feature separation
- document repository foundations
- audit logging foundations
- approval/rejection patterns
- BM and Agent operational surfaces
- requirement-aware planning history in the repo

---

## What Still Most Threatens Completion

- incomplete live verification
- dashboard startup and route slowness
- over-claiming feature completion based only on code presence
- leaving notifications or worker behavior unproven
- trying to redesign too much before closing requirement gaps

---

## Recommended Working Order Right Now

1. finish Phase 0
2. finish Phase 1
3. finish Phase 2
4. close the easiest high-value gaps from Phase 3
5. complete Phase 4 for COSAF reliability
6. stabilize the slowest routes in Phase 5
7. tighten role journeys in Phase 6
8. finish polish and presentation lock in Phase 7 and Phase 8

---

## Bottom Line

The system is not starting from zero.

A lot is already built.

The real work now is not “build everything.”

The real work is:

- verify what is real
- close the critical gaps
- stabilize the slow paths
- protect COSAF from unnecessary churn
- finish the role journeys
- present only what the system can honestly support
