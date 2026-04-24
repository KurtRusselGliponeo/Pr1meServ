# Phase 2-10 Aligned Checklist

This checklist updates the downstream phases to match the locked decisions in [PHASE_1_SCOPE_LOCK.md](C:\Users\layma\Documents\GitHub\client-reassignment-system\docs\PHASE_1_SCOPE_LOCK.md).

## Does the updated Phase 1 change Phases 2-10?

Yes.

The following Phase 1 decisions materially change later phases:

- Official visible client flow now uses `Forms Submitted` and retires business-visible `For Approval`.
- `Orphan` is an internal operational state, mainly for `Admin` and `BranchManager` views.
- Lapsation rule is now:
  - `1 month` unpaid = `Warning`
  - `2 months` unpaid = `Urgent`
  - `3 months` unpaid = `Lapsed`
- Persistency formula is now locked.
- Prospect pipeline is now:
  - `Contacted`
  - `Client Agreed`
  - `Presentation`
  - `Approved`
  - `Closed`
- Warm/cold labels are separate from pipeline stages.
- Document retention baseline is `7 years`.
- `productType` and `planCode` are required business data fields and both are strings.

Because of that, the original checklist needed downstream corrections.

## Core Direction

- Build 4 major modules from the requirements document:
  - `COSAF & Orphan Client`
  - `Lapsation Monitoring`
  - `Agent Performance Tracker`
  - `Document Repository`
- Add `Agent-Client Prospecting` as an additional module/page.
- Keep 3 distinct role experiences:
  - `Agent`
  - `BranchManager`
  - `Admin`
- Enforce RBAC across all features:
  - `Agent` sees only own data
  - `BranchManager` and `Admin` see branch-wide operational data

## Phase 2: Identity, Accounts, and Access Control

- [ ] Create account creation flow for agents using `PRULife email`.
- [ ] Set default password for agent as the `8-digit agent code`.
- [ ] Force password change on first login.
- [ ] Link each agent account to one agent profile only.
- [ ] Prevent agents from viewing other agents' accounts, clients, metrics, or documents.
- [ ] Add role-based sidebar menus per account type.
- [ ] Add secure profile picture upload and storage named by `agentCode`.
- [ ] Add audit logs for login, password reset, and user access changes.

## Phase 3: Data Model and Data Sources

- [ ] Normalize core tables:
  - `users`
  - `agent_profiles`
  - `client_profiles`
  - `policies`
  - `policy_transactions`
  - `recruitment_records`
  - `performance_metrics`
  - `prospects`
  - `documents`
  - `notifications`
  - `audit_logs`
- [ ] Connect and import source files:
  - `NAP`
  - `APE`
  - `PER`
  - `REC`
- [ ] Create branch-level ownership mapping for agents and clients.
- [ ] Add `productType` and `planCode` to client and policy-related records.
- [ ] Store full client history per assigned agent.
- [ ] Store reassignment history so there is a full audit trail.
- [ ] Add validation rules for duplicate client, duplicate policy, broken agent code, and missing IDs.

## Phase 4: Agent Workspace

- [ ] Build a unique `Agent homepage`.
- [ ] Show personal stats first:
  - persistency
  - active policies
  - total API/APE
  - policy count
  - recruitment summary
  - at-risk policies
- [ ] Show only clients assigned to that agent, including IDs and full client info.
- [ ] Show full client history owned by that agent.
- [ ] Allow workflow updates only on allowed statuses; block agent from editing restricted sales source data.
- [ ] Show lapsation states for that agent only using:
  - `Warning`
  - `Urgent`
  - `Lapsed`
- [ ] Add contextual quick actions:
  - update contact status
  - upload COSAF docs
  - open at-risk queue
  - open prospects

## Phase 5: Branch Manager Workspace

- [ ] Build a unique `Branch Manager homepage`.
- [ ] Show overall branch analytics across all agents in that branch.
- [ ] Show orphan client count, pending COSAF approvals, warning/urgent/lapsed policies, and top/bottom performers.
- [ ] Add report filters by month, agent, status, product, and lapsation state.
- [ ] Add `delist agent` workflow.
- [ ] When agent is delisted, transfer all clients to internal `Orphan` handling.
- [ ] Allow BM to assign orphan clients to a new agent.
- [ ] Notify new assigned agent automatically.
- [ ] Remove transferred clients from old/delisted agent portfolio.

## Phase 6: Admin Workspace

- [ ] Build a unique `Admin homepage`.
- [ ] Show quick actions first:
  - create account
  - reset password
  - delist agent
  - review logs
  - search agents and clients
- [ ] Add global search bar with suggestion menu for agents and clients.
- [ ] Show recent system logs:
  - new policies
  - uploads
  - returns
  - approvals
  - reassignments
  - notifications
- [ ] Allow admin full branch oversight.
- [ ] Allow admin to manage users, restore archived users, and reset passwords.

## Phase 7: COSAF and Orphan Client Workflow

- [ ] Build end-to-end orphan reassignment flow from resigned agent to new assigned agent.
- [ ] Track client status for every reassigned case using the locked visible flow:
  - `Uncontacted`
  - `Contacted`
  - `Forms Submitted`
  - `BM Signed`
  - `Done`
  - `Returned`
- [ ] Keep `Orphan` as an operational routing state, not a normal progress label.
- [ ] Build dedicated client folder handling for forms and IDs.
- [ ] Allow agent upload of scanned forms and ID documents.
- [ ] Auto-tag submitted COSAF uploads as `Forms Submitted`.
- [ ] Allow `Admin` and `BranchManager` to `Accept` or `Return`.
- [ ] Require a reason on `Return`.
- [ ] Allow BM to upload signed copy and trigger notification.
- [ ] Maintain full audit trail: who changed what, when, and why.
- [ ] Show timeline/history per client.

## Phase 8: Lapsation, Performance, and Reports

- [ ] Import NAP transactions and detect `Lapse`.
- [ ] Flag lapsation state using the locked business rule:
  - `1 month` unpaid = `Warning`
  - `2 months` unpaid = `Urgent`
  - `3 months` unpaid = `Lapsed`
- [ ] Track reinstatement events over time.
- [ ] Notify agents when a policy is `Warning`, `Urgent`, or `Lapsed`.
- [ ] Build agent-level performance dashboard from `PER`, `APE`, `REC`, and `NAP`.
- [ ] Compute persistency using the locked formula:
  - `Collected M2 to M13 premiums / (Collected M2 to M13 premiums + Uncollected M2 to M13 premiums of lapsed, surrendered, and unit cancelled policies)`
- [ ] Build BM/Admin leaderboard and drill-down analytics.
- [ ] Show monthly trends and comparisons.
- [ ] Generate downloadable reports for BM/Admin in a clean format.
- [ ] Include branch-wide views for:
  - total sales
  - persistency
  - lapsation
  - reinstatement
  - recruitment

## Phase 9: Document Repository and Cloud Storage

- [ ] Build centralized document library with categories aligned to Phase 1:
  - `COSAF`
  - `Lapsation`
  - `Recruitment`
  - `Compliance`
  - `Performance`
- [ ] Admin/BM can upload, edit metadata, archive, and pin.
- [ ] Agents can download or use allowed workflow upload paths only.
- [ ] Add version control and archive old versions automatically.
- [ ] Add keyword search, category filter, and file type filter.
- [ ] Add contextual quick-links from COSAF and Lapsation pages.
- [ ] Store files in secure cloud storage.
- [ ] Recommended solution:
  - primary: `Cloudflare R2`
  - fallback: `Google Drive API` with controlled folder structure
- [ ] Follow the locked retention and archival rules:
  - `7 years` retention baseline
  - archive superseded versions
  - avoid normal hard-delete for compliance-sensitive files
- [ ] Compression rule:
  - compress image uploads and PDFs intelligently
  - do not blindly recompress DOCX/XLSX if it risks corruption
- [ ] Add antivirus/malware scan and upload validation.

## Phase 10: Prospecting, QA, and Go-Live

- [ ] Build `Agent Prospecting` page.
- [ ] Prospect stages:
  - `Contacted`
  - `Client Agreed`
  - `Presentation`
  - `Approved`
  - `Closed`
- [ ] Keep `Warm` and `Cold` as separate labels with filters.
- [ ] Add notes, contact details, follow-up date, and reminders.
- [ ] Test all roles:
  - `Agent`
  - `BranchManager`
  - `Admin`
- [ ] Test all protected pages and sidebar visibility per role.
- [ ] Test delisting -> orphaning -> reassignment -> notification -> agent visibility.
- [ ] Test upload -> return with reason -> re-upload -> BM signed copy flow.
- [ ] Test warning/urgent/lapsed alerts and report generation.
- [ ] Seed demo accounts and demo data for all roles before rollout.

## Specific Solutions to Your Added Requests

- `Different homepage per role`: mandatory
- `Agent analytics first page`:
  - own policies
  - persistency
  - warning/urgent/lapsed cases
  - assigned clients
  - prospects
- `BM analytics first page`:
  - branch sales
  - orphan pool
  - approvals
  - top performers
  - report button
- `Admin first page`:
  - quick actions
  - recent logs
  - global search
- `Secure free cloud`:
  - use `Google Drive API` or `Cloudflare R2` based on current rollout constraints
- `Auto-compress documents`:
  - compress image/PDF uploads server-side
  - preserve quality
  - skip unsafe recompression for Office files

## What changed from the earlier checklist

- Replaced downstream references to visible `For Approval` with `Forms Submitted`.
- Converted vague lapsation threshold wording into the locked `1 month` / `2 months` / `3 months` rule.
- Removed “persistency still needs confirmation” language and inserted the locked formula.
- Kept `Orphan` as operational/internal in workflow wording.
- Kept prospect stages aligned with `Client Agreed` and `Approved`.
- Added `productType` and `planCode` to Phase 3.
- Aligned document retention wording to the locked `7-year` archival baseline.
