# Overall Delivery Plan

This is the main execution plan for the current `Drea` branch.

It combines:

- the original branch requirements
- the current codebase state
- the current UI and performance findings
- the practical deadline pressure for COSAF and manager presentation readiness

This is not only a UI plan.

For this project, the correct scope is:

- UI
- UX
- frontend performance
- backend/API fixes
- data flow verification
- audit and notification reliability
- demo readiness

If a backend change is needed to make the UI truthful, fast, complete, or reliable, it is part of the plan.

## Sources Used For This Plan

- `docs/requirements-alignment-review.md`
- `docs/ui-planning.md`
- `docs/phase-0-baseline-check.md`
- current frontend and backend module structure
- current implemented COSAF, documents, notifications, lapsation, and performance code

## Current State Snapshot

## What Looks Strong Right Now

- COSAF workflow foundation exists
- COSAF approval and rejection backend exists
- rejection reason validation exists
- signed copy upload flow exists
- document repository exists with archive and version behavior
- notification logging exists
- audit logging exists
- role-based access exists across major flows

## What Looks Partial Or Risky Right Now

- full live verification is still incomplete
- performance dashboard route is still risky
- some notifications are implemented in code but not fully operationally proven
- lapsation and performance data quality still need final validation
- shared dashboard polish is incomplete

## Planning Rules

These rules apply to all phases below.

### Rule 1: COSAF Scope Lock In Early Phases

For now, we do not do broad COSAF redesign work.

Allowed COSAF work in early phases:

- bug fixes
- requirement-critical fixes
- data correctness fixes
- status flow fixes
- upload and approval reliability fixes
- loading, error, and clarity fixes

Not allowed in early phases:

- broad visual redesign of the COSAF module
- unnecessary restructuring of the COSAF workflow
- cosmetic rework that risks breaking a working flow

Reason:

- COSAF is one of the most important workflows
- it already has real implementation progress
- the safer move is to stabilize and verify it first, not redesign it

### Rule 2: Fix Truth Before Polish

We do not polish screens that still have:

- broken behavior
- unclear state transitions
- fake loading
- missing data
- unreliable actions

### Rule 3: Shared Improvements Are Allowed

We should prioritize improvements that benefit many modules at once:

- login path
- dashboard shell
- sidebar
- navigation responsiveness
- loading states
- error states
- notification reliability
- query/refetch behavior

### Rule 4: Local Database Must Remain Supported

This branch must continue to work with local Postgres and pgAdmin.

No plan item should force a switch to Supabase-only behavior.

## Main Objective

Finish the system to a manager-presentable, workflow-trustworthy state as fast as possible, while protecting COSAF and preserving local database use.

## Delivery Priorities

### Priority 1

- requirement coverage
- bug fixing
- workflow completion
- demo safety

### Priority 2

- performance stabilization
- shared UI clarity
- navigation and sidebar improvements

### Priority 3

- visual refinement
- role-level polish
- broader product presentation quality

## Phase Structure

## Phase 0: Requirement Lock, Bug Triage, and Scope Protection

Goal:

- lock what the system must achieve
- stop random redesign work
- identify what is actually broken versus what is just ugly

Scope:

- use the requirement review as the source of truth
- classify features as implemented, partial, needs confirmation, or missing
- define bug list by severity
- define demo blockers
- protect COSAF from unnecessary redesign

Tasks:

- convert requirement review into execution checklist
- list all current critical bugs and risky flows
- identify which modules are demo-safe and which are not
- identify which unfinished areas are acceptable to defer
- freeze broad COSAF UI redesign

Done when:

- the team agrees what is critical before the presentation
- the bug list is clearer than the wishlist
- COSAF only receives bug and requirement work, not redesign work

## Phase 1: Shared Stability, Login, Shell, and Sidebar

Goal:

- make the app feel more stable and usable before touching deeper workflow polish
- complete the shared shell improvements that affect every page

This phase includes the sidebar plan from the earlier UI planning.

Scope:

- login and auth startup path
- dashboard shell responsiveness
- route transitions
- sidebar and navigation behavior
- loading/error/empty state clarity

Tasks:

- reduce delays before login page appears
- reduce delays before the dashboard shell becomes usable
- keep shell-level UI visible while page content loads
- reduce aggressive or wasteful route prefetching
- reduce repeated refetches where possible
- make blocking loading states less confusing
- improve dashboard transition behavior

Sidebar tasks:

- make collapsed sidebar a true slim rail
- remove wasted width in collapsed mode
- keep logo and menu control aligned
- keep icons centered and readable
- ensure main content expands properly when sidebar collapses
- add tooltip or hover clarity if labels are hidden
- improve header and navigation spacing so the shell feels intentional

COSAF rule in this phase:

- no broad COSAF redesign
- only fix COSAF if it blocks the shared shell, performance, or bug-fix goals

Done when:

- login is more reliable
- dashboard shell feels lighter
- sidebar no longer wastes space
- route switching feels more immediate
- loading states are more understandable

## Phase 2: Requirement Completion Pass Outside COSAF

Goal:

- finish as much of the non-COSAF requirement surface as possible while COSAF stays stable

Scope:

- documents
- notifications
- lapsation
- performance
- role-home usefulness

Tasks:

- verify document repository categories and access rules
- verify versioning, archive, metadata, pinning, search, and quick links
- verify admin notification logs and improve message usefulness if needed
- verify lapsation import, at-risk logic, reinstatement, and role visibility
- verify performance pages, leaderboard behavior, and monthly filtering support
- identify missing or weak non-COSAF requirement items and fix them

Done when:

- non-COSAF modules align better with the original requirements
- the highest-risk missing requirement items outside COSAF are reduced

## Phase 3: COSAF Reliability and Requirement Completion

Goal:

- finish COSAF as a dependable workflow without broad redesign

Important:

This is where COSAF gets focused work, but still not a vanity redesign phase.

Scope:

- orphan client flow
- reassignment flow
- upload flow
- approval and rejection flow
- signed copy flow
- case status visibility
- audit/history visibility
- required notifications

Tasks:

- verify resigned agent to orphan flow
- verify batch reassignment flow with local data
- verify agent upload flow for forms and IDs
- verify automatic move to approval queue
- verify return flow and rejection reason visibility
- verify signed-copy upload and resulting state changes
- verify audit trail visibility
- improve COSAF loading/error states where needed
- fix requirement gaps or broken states found during live tests

Not in scope:

- broad visual redesign for COSAF cards, layouts, or branding unless needed for clarity

Done when:

- COSAF can be demonstrated confidently end-to-end
- the workflow is trustworthy and understandable

## Phase 4: Data Confidence, Local DB Safety, and Demo Data

Goal:

- make sure the system behaves correctly with local data and can be demonstrated safely

Scope:

- local database compatibility
- migration safety
- seeded demo data
- realistic verification flows

Tasks:

- confirm all required migrations for current branch
- protect local Postgres workflow
- verify no required feature depends on Supabase-only configuration
- seed or prepare demo-safe users and data
- create a simple demo walkthrough dataset

Done when:

- the app can be demonstrated locally with confidence
- the team knows exactly which accounts and datasets to use

## Phase 5: Performance and Slow-Route Stabilization

Goal:

- remove the biggest remaining slow or awkward experiences

Scope:

- performance page
- lapsation page
- admin home heavy queries
- document-related refresh behavior

Tasks:

- profile the slowest route-level queries and requests
- reduce heavy blocking skeleton states
- keep previous data visible where safe
- improve perceived progress during slow queries
- optimize backend queries if they are the actual bottleneck
- confirm that slow areas still show meaningful empty/error states

Done when:

- the known slowest pages are no longer demo-risky
- the user understands what the system is doing during waits

## Phase 6: UX Consistency and Page-Level Polish

Goal:

- improve product confidence without breaking flows

Scope:

- shared spacing and typography
- cards, tables, and forms
- role-home summaries
- selected high-visibility pages

Tasks:

- standardize spacing and content density
- remove awkward label, copy, or hierarchy issues
- refine selected page headers and summary sections
- make empty, success, and error states clearer
- improve polish on documents, dashboard home, and selected admin views

COSAF rule in this phase:

- only light polish if the workflow is already stable
- no risky redesign late in the cycle

Done when:

- the app feels more intentional and coherent
- presentation quality improves without destabilizing the system

## Phase 7: Final Requirement Review and Presentation Lock

Goal:

- make sure the system can be presented honestly and confidently

Scope:

- requirement-by-requirement review
- live smoke test
- final known-issue list
- presentation prep

Tasks:

- recheck each major requirement area
- prepare final done/partial/not-demoed summary
- test login, dashboard, COSAF, documents, notifications, lapsation, and performance
- record remaining limitations clearly
- prepare recommended talking points for manager demo

Done when:

- the team can present the system with confidence
- known gaps are controlled and explained

## Module-Level Plan

## COSAF

Current direction:

- preserve
- verify
- fix bugs
- complete requirement gaps
- avoid redesign first

Needed work:

- end-to-end live verification
- status clarity
- rejection and signed-copy validation
- audit/history visibility
- notification confirmation

## Documents

Current direction:

- strengthen as a showcase module

Needed work:

- verify archive/version behavior live
- verify category filtering and quick links
- improve upload clarity if needed

## Notifications

Current direction:

- prove operationally, not just in code

Needed work:

- verify one or more live send paths
- verify logs are useful to Admin
- improve message details where helpful

## Lapsation

Current direction:

- verify data correctness
- reduce demo risk

Needed work:

- validate import logic
- verify at-risk and reinstatement behavior
- improve page responsiveness and clarity

## Performance

Current direction:

- stabilize before polish

Needed work:

- verify leaderboard and metrics behavior
- reduce route slowness
- confirm filtering and useful summaries

## Shared Shell

Current direction:

- finish early because it helps every module

Needed work:

- sidebar slim-rail behavior
- persistent shell visibility
- faster-feeling navigation
- cleaner top bar and spacing

## Suggested Execution Order

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7

## Practical Notes

- COSAF should be treated as protected workflow scope in early phases
- broad visual redesign should wait until requirement coverage and bug fixing are in a safer place
- local Postgres support must remain intact
- performance work and sidebar work should happen early because they improve the whole system
- the final goal is not just a nicer app, but a more complete and manager-trustworthy system
