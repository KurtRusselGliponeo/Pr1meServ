# Phase 1 Scope Lock

This document locks the current Phase 1 business rules for the client reassignment system based on the repo's implemented behavior as of 2026-04-23, while clearly separating stakeholder-dependent rules that still need formal sign-off.

## Purpose

- Establish one source of truth for Phase 1 roles, statuses, reassignment handling, prospect flow, reporting scope, and document rules.
- Highlight where the existing implementation already enforces a rule.
- Flag decisions that should remain provisional until confirmed by business owners or IT.

## Scope Lock Summary

### Locked for implementation

- Roles: `Agent`, `BranchManager`, `Admin`
- Client status flow: `Uncontacted` -> `Contacted` -> `Forms Submitted` -> `BM Signed` -> `Done`
- Client exception status: `Returned`
- Orphan handling: orphaned clients remain operationally visible and reassignable by `Admin` and `BranchManager`
- Prospect temperature labels: `Warm`, `Cold`
- Product data fields: `productType` and `planCode` are stored as strings
- Document upload roles: `Admin` and `BranchManager` can upload and pin; `Agent` can read and complete COSAF callback flow
- Document max upload size: `25 MB`
- Document allowed upload types: PDF, Word, Excel
- Document versioning rule: version increments automatically per base filename within a category

### Needs explicit business or IT sign-off

- Exact business mapping from raw source files into the finalized lapsation and persistency calculations

## Role Matrix

| Capability                     | Agent | BranchManager | Admin |
| ------------------------------ | ----- | ------------- | ----- |
| View assigned client records   | Yes   | Yes           | Yes   |
| Import client profiles         | No    | Yes           | Yes   |
| Reassign clients               | No    | Yes           | Yes   |
| View orphan clients            | No    | Yes           | Yes   |
| Upload branch documents        | No    | Yes           | Yes   |
| View document library          | Yes   | Yes           | Yes   |
| Pin/unpin documents            | No    | Yes           | Yes   |
| Complete COSAF upload callback | Yes   | Yes           | Yes   |
| Approve or return COSAF        | No    | Yes           | Yes   |
| Access notification logs       | No    | No            | Yes   |
| Manage users                   | No    | No            | Yes   |

### Role intent

- `Agent` executes outreach, prospecting, document completion, and follow-up on assigned records.
- `BranchManager` governs review, approval, reassignment, and branch-level oversight inside the manager's own branch.
- `Admin` owns platform governance, user management, escalations, and cross-branch operational control across the whole system.

## Official Client Status Flow

### Locked lifecycle

1. `Uncontacted`
2. `Contacted`
3. `Forms Submitted`
4. `BM Signed`
5. `Done`

### Exception status

- `Returned`: used when a Branch Manager or Admin rejects submitted requirements and sends the case back for correction.

### Internal-only status

- `Orphan`: is an operational routing state, not a normal client journey milestone.

### Status notes

- The official visible post-upload status is `Forms Submitted`.
- `For Approval` should be retired from the business-visible lifecycle and, if still needed technically, replaced by approval-table state rather than a separate client status.
- The current shared schema still includes both `For Approval` and `Orphan`, so schema and workflow cleanup is still required.

## Orphan Reassignment Rules

When an agent is delisted, terminated, or resigned:

- All active assigned client records must be detached from the departing agent immediately.
- Those records must enter the orphan pool and become reassignable by `BranchManager` and `Admin`.
- The system must preserve the previous assignment in audit logs.
- No orphaned client should disappear from reporting because of missing ownership.
- New manual reassignment must require an explicit `Admin` or `BranchManager` action.

### Locked interpretation

- Use `Orphan` as a system-managed routing condition.
- Keep `Orphan` visible in Admin and BranchManager operational views only.
- Do not treat `Orphan` as a normal client-progress status for standard agent workflow views.
- Do not auto-assign orphaned clients to another live agent unless the business explicitly asks for round-robin or capacity-based redistribution.
- Preserve service continuity first: visibility, auditability, and reassignment queueing matter more than immediate silent reassignment.

## Lapsation "At Risk" Rule

### Locked rule

- `1 month` unpaid: `Warning`
- `2 months` unpaid: `Urgent`
- `3 months` unpaid: `Lapsed`

### Implementation rule

- The system should treat the first two months as at-risk stages before the case becomes fully lapsed on the third month.
- If needed in code, these can map to internal risk levels while preserving the business labels above.
- Source-file mapping and exact aging derivation still need to be documented for implementation consistency.

## Persistency Formula

### Locked formula

Persistency is defined as:

`Collected M2 to M13 premiums / (Collected M2 to M13 premiums + Uncollected M2 to M13 premiums of lapsed, surrendered, and unit cancelled policies)`

### Implementation rule

- Persistency should be computed from imported performance and premium-collection data, not manually keyed in the UI.
- The system should preserve the raw imported values needed to support auditability of the formula output.
- Exact source-file mapping and transformations still need to be documented so implementation follows the business formula consistently.

## Report Types for BM and Admin

### Locked minimum report set

- Client status summary by agent
- Client status aging report
- Orphan client queue report
- COSAF approvals pending report
- COSAF returned cases report
- Lapsation at-risk summary
- Lapsation reinstatement summary
- Performance leaderboard by month
- Recruitment count summary
- Document library activity and version history
- Notification dispatch log

### Role emphasis

- `BranchManager`: branch operations, pending approvals, returned cases, orphan queue, agent productivity
- `Admin`: all BM reports plus user governance, notification logs, cross-branch rollups, and audit-heavy operational reporting

## Prospect Pipeline

### Official target flow

1. `Contacted`
2. `Client Agreed`
3. `Presentation`
4. `Approved`
5. `Closed`

### Current implemented flow

1. `Cold Prospect`
2. `Contacted`
3. `Presentation`
4. `Agreed`
5. `Closed`

### Scope lock decision

- Lock temperatures separately as `Warm` and `Cold`.
- Lock pipeline stages as business-progress stages only.
- Replace `Cold Prospect` with temperature metadata, not a pipeline stage.
- Rename `Agreed` to `Client Agreed`.
- Keep `Approved` before `Closed`.

This change will require schema, migration, and UI updates because the current implementation does not match the locked flow.

## Warm/Cold Labeling Rules

### Locked rule

- `Warm`: prospect has an existing relationship, referral context, prior engagement, or positive response history.
- `Cold`: prospect has no prior relationship and no qualifying engagement history.

### Implementation rule

- Temperature is a lead-quality label and must not double as a pipeline stage.
- A prospect can remain `Warm` or `Cold` while advancing through all pipeline stages.

## Product and Plan Data

### Locked rule

- Add `productType` as a string field.
- Keep `planCode` as a string field.

### Meaning

- `productType`: readable business-facing product or insurance name
- `planCode`: raw source-system code, even when it looks numeric

### Data handling rule

- Do not store `planCode` as a numeric field.
- `productType` may be manually entered, imported, or derived from a future plan-code mapping.
- Both fields should support reporting, filtering, and future product classification logic.

## File and Document Rules

### Locked for Phase 1

- Max file size: `25 MB`
- Allowed file types:
  - `application/pdf`
  - `application/msword`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `application/vnd.ms-excel`
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Upload authority: `Admin`, `BranchManager`
- Read access: all roles
- Versioning: system auto-increments document version for same base filename within category
- File categories in active use:
  - `COSAF`
  - `Lapsation`
  - `Recruitment`
  - `Compliance`
  - `Performance`

### Security rule

- Block executable or script-like uploads regardless of filename spoofing.
- Validate using MIME and content-signature checks.
- Keep malware scanning enabled where infrastructure supports it.

### Retention and archival lock

- Retain active and historical document versions for `7 years` unless business or compliance later requires a longer period.
- Archive superseded versions instead of deleting them.
- Do not hard-delete compliance-sensitive files through normal application actions.
- Keep the latest version as the default visible version while preserving full version history for `Admin` and `BranchManager`.
- Support stricter category-based retention rules later if compliance requires them.

## Repo Alignment Notes

### Already aligned

- Roles are defined as `Admin`, `BranchManager`, `Agent`.
- Client schema already supports the requested client statuses plus `Orphan`.
- Orphan-pool support exists in migrations.
- Prospect temperature already supports `Warm` and `Cold`.
- Document uploads already enforce `25 MB` max size in the frontend and auto-version in the backend.

### Not yet aligned

- Client flow in project docs still references `For Approval` in some places.
- Prospect pipeline in code still uses `Cold Prospect` and `Agreed`.
- Document retention behavior in code may not yet fully enforce the locked archival policy.
- `ClientProfiles` does not yet store `productType`.
- `ClientProfiles` does not yet store `planCode`.
- Persistency and lapsation formulas are now defined, but source-data mapping and calculation implementation may still need code changes.

## Immediate Follow-up After Scope Lock

- Remove `For Approval` from shared schemas and workflow docs, or demote it to non-user-facing technical state if temporarily needed during transition.
- Keep `Orphan` in Admin and BM operational surfaces only, not in normal agent progress labels.
- Update prospect enum and migration to `Contacted`, `Client Agreed`, `Presentation`, `Approved`, `Closed`.
- Convert the report list above into API/reporting backlog items.
- Add code and UI enforcement for the locked retention and archival rules.
- Add `productType` and `planCode` to the client data model and related imports.
- Implement the locked lapsation aging rules in code.
- Implement the locked persistency formula in code based on agreed source mappings.
