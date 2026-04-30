# User Flow

## Role-Based System Flow Map

This document explains the current and intended user flows for the three main roles:

- Admin
- Branch Manager
- Agent

It is based on:

- the current code
- the navigation model
- the current role dashboard surfaces
- the planning documents
- the requirement review

This is a text-based flow guide, not a diagram.

Its purpose is to show:

- what each role is supposed to do
- what the current branch already supports
- what parts of the flow still need completion or proof

---

## Flow Reading Guide

Each role section is organized into:

- primary goal
- current entry points
- normal flow
- supporting modules
- current strengths
- current gaps

---

## 1. Admin User Flow

## Primary Goal

The Admin governs the system globally.

Admin is responsible for:

- user lifecycle control
- branch-wide search
- orphan and reassignment oversight
- system log review
- cross-module governance

## Current Entry Points

Current navigation and home surface point the Admin to:

- `/dashboard`
- `/dashboard/cosaf`
- `/dashboard/cosaf/reassign`
- `/dashboard/documents`
- `/dashboard/lapsation`
- `/dashboard/performance`
- `/dashboard/prospects`
- `/dashboard/admin/users`
- `/dashboard/admin/notifications`

## Recommended Admin Flow

### Flow A: Daily Governance Check

1. Open `/dashboard`
2. Review top-level counts:
   - active users
   - active agents
   - orphan clients
   - pending approvals
3. Review recent system logs
4. identify whether the day’s highest priority is:
   - access problem
   - orphan reassignment
   - upload/approval issue
   - notification issue

### Flow B: User Lifecycle Control

1. Go to `/dashboard/admin/users`
2. create user accounts when needed
3. edit roles or profile details when needed
4. reset passwords using Admin-only controls
5. restore archived users when appropriate

Expected system rule:

- only Admin performs these actions

### Flow C: Search and Jump

1. use the global search from Admin home
2. search for an agent or client
3. jump directly into the relevant operational record
4. continue investigation in COSAF, agent profile, or related page

### Flow D: Reassignment Oversight

1. go to `/dashboard/cosaf/reassign`
2. review orphaned or impacted clients
3. reassign clients to the correct destination agent
4. confirm history and status updates
5. if needed, verify that the receiving agent is informed

### Flow E: Logs and Notifications Review

1. go to `/dashboard/admin/notifications`
2. inspect recent notification and system events
3. confirm whether:
   - upload events are being recorded
   - returns and approvals are logged
   - notification events are visible

## Supporting Modules

- user management
- admin overview
- admin search
- notification logs
- COSAF reassignment
- documents

## Current Strengths

- Admin home already points to the right governance actions
- global search is implemented in the Admin surface
- user management route exists
- logs route exists
- orphan/reassignment quick access exists

## Current Gaps

- full user lifecycle still needs final live verification
- notification logs are present but delivery proof is still needed
- Admin governance is only as strong as the underlying workflow verification

---

## 2. Branch Manager User Flow

## Primary Goal

The Branch Manager manages branch operations.

BM is responsible for:

- viewing branch health
- managing orphan client reassignment inside the branch
- reviewing and deciding on COSAF submissions
- monitoring branch-level performance and lapsation pressure
- delisting agents when necessary

## Current Entry Points

Current navigation and BM dashboard point the Branch Manager to:

- `/dashboard`
- `/dashboard/cosaf`
- `/dashboard/cosaf/reassign`
- `/dashboard/documents`
- `/dashboard/lapsation`
- `/dashboard/performance`
- `/dashboard/prospects`

## Recommended BM Flow

### Flow A: Branch Overview

1. Open `/dashboard`
2. review branch summary:
   - orphan client count
   - pending COSAF approvals
   - warning/urgent/lapsed policies
   - active agents
   - API and APE totals
3. use filters for month, agent, status, product, and lapsation state
4. identify urgent branch actions

### Flow B: COSAF Approval Queue

1. go to `/dashboard/cosaf`
2. review pending COSAF submissions
3. open a submission
4. decide:
   - approve
   - return with reason
   - upload signed copy when applicable
5. confirm case status updates

Expected decision points:

- incomplete packet → return with clear reason
- clean packet → approve
- signed file ready → upload signed copy and move case forward

### Flow C: Orphan Reassignment

1. go to `/dashboard/cosaf/reassign`
2. review orphaned clients
3. select destination agent
4. complete reassignment
5. confirm that the case leaves the orphan state and enters the assigned workflow

### Flow D: Delist Agent

1. from BM home, use delist agent action
2. submit the target agent code
3. confirm that the agent is delisted
4. confirm that the impacted client set moves into orphan handling
5. continue with reassignment

### Flow E: Branch Performance Review

1. review top performers and bottom performers from the BM home surface
2. move to `/dashboard/performance` for deeper leaderboard and KPI analysis
3. use filters by month or agent where needed
4. identify intervention or coaching needs

### Flow F: Lapsation Monitoring

1. open `/dashboard/lapsation`
2. review branch warning, urgent, and lapsed policies
3. identify cases needing rescue
4. follow up with agents or review reinstatement activity

## Supporting Modules

- BM dashboard
- COSAF approvals
- reassignment module
- delist-agent action
- branch filters
- performance and lapsation routes

## Current Strengths

- BM home already reflects operational responsibilities well
- branch analytics and filters exist
- orphan reassignment entry point exists
- approval-oriented COSAF direction is present
- delist workflow is surfaced in UI

## Current Gaps

- full live proof of the BM approval cycle is still needed
- signed-copy workflow still needs final end-to-end validation
- performance route stability is still a concern
- lapsation and performance views need more confidence as presentation surfaces

---

## 3. Agent User Flow

## Primary Goal

The Agent works from a task-first operational view.

Agent is responsible for:

- reviewing assigned clients
- updating contact or follow-up status
- uploading COSAF forms and required documents
- monitoring at-risk policies
- reviewing portfolio and performance indicators
- managing prospect pipeline work

## Current Entry Points

Current navigation and Agent dashboard point the Agent to:

- `/dashboard`
- `/dashboard/cosaf`
- `/dashboard/documents`
- `/dashboard/lapsation`
- `/dashboard/performance`
- `/dashboard/prospects`

## Recommended Agent Flow

### Flow A: Daily Task Review

1. open `/dashboard`
2. review personal summary:
   - persistency
   - active policies
   - API and APE totals
   - policy count
   - recruitment count
   - warning/urgent/lapsed counts
3. identify the highest priority task for the day

### Flow B: Assigned Client Review

1. from Agent home, inspect assigned clients
2. identify which clients require:
   - contact update
   - COSAF upload
   - policy rescue
3. continue into the appropriate module

### Flow C: COSAF Upload Workflow

1. go to `/dashboard/cosaf`
2. find the assigned case
3. upload COSAF documents and required IDs
4. submit the packet into the approval flow
5. monitor whether the case moves to:
   - forms submitted
   - returned
   - BM signed
   - done

If returned:

1. read the return reason
2. correct the submission
3. re-upload and resubmit

### Flow D: At-Risk Policy Action

1. review at-risk policy list from Agent home or `/dashboard/lapsation`
2. identify warning, urgent, and lapsed cases
3. follow up with clients
4. complete reinstatement-related work where allowed
5. monitor status changes

### Flow E: Prospect Pipeline

1. open `/dashboard/prospects`
2. review pipeline stage counts
3. move prospects through the CRM workflow
4. use this alongside branch production work

### Flow F: Performance Awareness

1. review personal summary at home
2. open `/dashboard/performance` when deeper KPI view is needed
3. review own position and trend context

## Supporting Modules

- agent dashboard
- assigned client list
- COSAF upload panel
- lapsation route
- performance route
- prospects route
- document library quick access

## Current Strengths

- Agent home is task-oriented
- assigned clients and at-risk policies are surfaced
- quick actions align with real agent work
- the role clearly has its own scoped dashboard intent

## Current Gaps

- full live COSAF return-and-resubmit flow still needs final proof
- performance route stability can hurt Agent confidence
- some workflow transitions are implemented but not yet presentation-safe

---

## Shared Cross-Role Flow

These workflows depend on more than one role.

## Cross-Role Flow 1: Orphan Client Reassignment to COSAF Completion

1. Admin or BM delists or removes an agent from active ownership
2. affected clients become orphaned
3. Admin or BM reassigns those clients to a new agent
4. agent receives the assignment and works the case
5. agent uploads COSAF documents
6. Admin or BM reviews the submission
7. submission is either returned with reason or approved
8. signed copy is uploaded when required
9. case reaches final status

This is the most important business flow in the system.

## Cross-Role Flow 2: Document Governance

1. Admin or BM uploads or updates official documents
2. old versions are archived
3. pinned documents stay discoverable
4. agents access the latest approved files
5. related modules expose quick links to relevant categories

## Cross-Role Flow 3: Lapsation Response

1. system identifies warning, urgent, or lapsed policy condition
2. affected role sees the case in their scoped view
3. agent acts on the client
4. BM/Admin can monitor risk concentration and reinstatement outcomes

---

## Highest-Priority Flow To Perfect First

If the team can only perfect one end-to-end flow first, it should be:

1. orphan client enters queue
2. reassignment happens
3. agent uploads COSAF packet
4. BM/Admin reviews
5. return or approval happens
6. signed copy is uploaded
7. audit and notification trail is visible

That flow is the strongest bridge between the original requirements and the manager presentation.
