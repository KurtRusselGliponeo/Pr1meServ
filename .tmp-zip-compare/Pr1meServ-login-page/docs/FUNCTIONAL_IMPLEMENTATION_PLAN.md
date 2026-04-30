# Functional Implementation Checklist

This checklist aligns the system's architecture to directly satisfy the rigorous functional requirements outlined in your specification (3.1.1 through 3.1.5).

## 3.1.1 COSAF & Orphan Client Module

- `[x]` **Agent Resignation Automator**: Build a backend event listener triggering on Agent "Terminated" status to perform a bulk SQL `UPDATE ClientProfiles SET assignedAgentId = NULL, caseStatus = 'Orphan'` `⚡ PERFORMANCE`
- `[x]` **Batch Assignment Endpoint**: Enhance the existing `ReassignClientSchema` to support array payloads instead of single identifiers to allow batch-assign.
- `[x]` **New Assignment Gmail Trigger**: Connect the batch re-assigner loop to `emailQueueService` to queue a template-based message for the new agent.
- `[x]` **Expanded Case Statuses**: Update `@a1prime/schemas` CaseStatus type to explicitly strictly enforce: `Uncontacted`, `Contacted`, `For Approval`, `Forms Submitted`, `BM Signed`, `Done`, `Returned`.
- `[x]` **Form Upload Workflow**:
  - `[x]` Route client-to-R2 presigned upload paths to store folder IDs inside the `ClientProfiles` reference.
  - `[x]` Add middleware enforcing automatic transitioning of `caseStatus` to `For Approval` upon successful object callback.
- `[x]` **BM Review & Return Logic**:
  - `[x]` Add `returnReason` string limit constraints to database for when Admin/BM hits 'Return'.
  - `[x]` Track returning payload signatures inside `SystemAuditLogs`.
- `[x]` **BM Countersign Uploader**: BM UI logic for re-uploading signed form, pushing a custom "Branch Manager Approved" payload to the Agent via Gmail OAuth.
- `[x]` **Audit Trail Foundation**: _(Completed)_ `SystemAuditLogs` already tracks historical status transitions.

## 3.1.2 Lapsation Monitoring Module

- `[x]` **NAP Importer Stream Engine**: Read `Transaction_Type` and `Credit_Status` natively from CSV streams inside the `bullMQ` file worker to execute `LAPSE` logic exclusively when conditions map (Type=Lapse, Status=Debit).
- `[x]` **At-Risk Threshold Logic**: Build scheduled SQL scanner running `DATEDIFF` logic against `Processing_Days` configuration constraints to auto-flag policies as `At-Risk`.
- `[x]` **Reinstatement Tracking**: Add chronological triggers catching `REINSTATEMENT` debits to invert Lapse statuses and push historical logs.
- `[x]` **Metric Aggregation**: Extend Performance queries to calculate ratio formulas for (Lapsed / Total Output) for Agent-level and Branch-level arrays.
- `[x]` **Agent Email Hooks**: Connect the daily scan job straight to the Notification queue to proactively ping agents upon Lapse condition triggers.

## 3.1.3 Agent Performance Tracker Module

- `[x]` **Persistency Data Models**: Expand database to ingest `PER` file format for Personal, Unit, and Branch scoring values.
- `[x]` **APE Processing Engine**: Correlate plan breakdowns vs Policy counts securely parsing APE CSV formats natively.
- `[x]` **Unified Agent View UI**: Ensure the frontend dashboard bridges both the `ClientProfiles` Drizzle queries alongside the performance rollups in one pane.
- `[x]` **Recruitment KPI Processing**: Connect the `REC` file format structural imports strictly tracking onboard tenure vs active/term rates.
- `[x]` **Leaderboard Components**: Establish UI Grid components fetching `GROUP BY` API lists sorted by ranking outputs.
- `[x]` **Monthly UI Filters**: Ensure parameter query bindings on the Next.js frontend update the `recordMonth` keys sent to the backend.

## 3.1.4 Document Repository Module

- `[x]` **Document Library Drizzle Tables**: Enhance the scaffolded table to enforce strict Categories Enum (COSAF, Lapsation, Recruitment, Compliance, Reports).
- `[x]` **Role-based Storage Access**: Build IAM-like constraints where Agents GET only, and Admin/BMs perform PUT commands. `🔒 SECURITY`
- `[x]` **Deep Version Control**: Enforce logic inside S3 bucket naming structures setting `[filename]_v2.pdf` while archiving `v1` natively, mapping statuses (Active, Draft, Archived).
- `[x]` **Pinning Feature**: Add a `isPinned` boolean column optimized by a partial index.
- `[x]` **Contextual Links**: Enable keyword tag filters on the `DocumentLibrary` API allowing the COSAF and Lapsation modules to execute "fetch documents by category = COSAF" to embed helper buttons inside the main feature UI.

## 3.1.5 Notification System

- `[x]` **Gmail OAuth 2.0 Automation**: Ensure template processors capture context strings (Return reason, dynamic R2 document link, Policy Num).
- `[x]` **Admin Send Logs Panel**: Connect a React Data table purely pulling from `SystemAuditLogs` where `actionType = EMAIL_DISPATCHED` to enforce transparent deliverability checks.
