# Corrected Codebase Audit

This document is a repo-grounded correction of the earlier system architect audit. It keeps the same module framing, but adjusts statuses and file references based on what is actually present in this codebase as of April 17, 2026.

## 3.1.1 COSAF & Orphan Client Module

### Agent Resignation Automator

- Status: [❌ Missing]
- Found In: [backend/src/shared/db/schema/client-profiles.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/shared/db/schema/client-profiles.ts:7), [backend/src/services/client-profiles.service.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/services/client-profiles.service.ts:194)
- Corrected Assessment: The report is directionally correct, but the gap is bigger than "no listener/webhook." `assignedAgentId` is defined as required, so the data model currently prevents null or orphan ownership. The reassignment flow only supports moving clients from one active agent to another.

### Batch Assignment Endpoint

- Status: [✅ Verified]
- Found In: [backend/src/services/client-profiles.service.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/services/client-profiles.service.ts:194)
- Corrected Assessment: Verified. Batch reassignment uses `inArray(...)` inside a transaction and rolls back when the source/destination validation fails.

### New Assignment Gmail Trigger

- Status: [❌ Missing]
- Found In: [backend/src/services/client-profiles.service.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/services/client-profiles.service.ts:234)
- Corrected Assessment: Verified as missing. The reassignment path updates rows and writes audit logs but does not enqueue any outbound notification to the newly assigned agent.

### Expanded Case Statuses

- Status: [⚠️ Incomplete]
- Found In: [packages/schemas/src/index.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/packages/schemas/src/index.ts:16), [packages/schemas/src/client-profiles.schema.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/packages/schemas/src/client-profiles.schema.ts:3), [backend/src/shared/db/schema/client-profiles.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/shared/db/schema/client-profiles.ts:21)
- Corrected Assessment: The mismatch is real if the required statuses are now `Forms Submitted`, `BM Signed`, and `Done`. However, this is not only a Drizzle table issue. The enum contract is shared across the schema package, API validation, and DB persistence.

### Form Upload Workflow

- Status: [⚠️ Incomplete]
- Found In: [backend/src/services/documents.service.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/services/documents.service.ts:16)
- Corrected Assessment: Presigned upload support exists, but no workflow links a successful form upload back to COSAF progression or client `caseStatus` transitions.

### BM Review & Return Logic

- Status: [⚠️ Incomplete]
- Found In: [backend/src/routes/cosaf-approvals.routes.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/routes/cosaf-approvals.routes.ts:20), [backend/src/services/cosaf-approvals.service.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/services/cosaf-approvals.service.ts:43)
- Corrected Assessment: The rejection route correctly requires a reason, but the reason is only stored in audit-log JSON, not in a first-class approval column. That makes querying, reporting, and rendering return reasons harder than the requirement suggests.

### BM Countersign Uploader

- Status: [❌ Missing]
- Found In: N/A
- Corrected Assessment: No explicit countersign upload endpoint or approval-chain binding was found.

### Audit Trail Foundation

- Status: [✅ Verified]
- Found In: [backend/src/shared/db/schema/system-audit-logs.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/shared/db/schema/system-audit-logs.ts:5)
- Corrected Assessment: Verified. Generic audit storage supports action, entity, and JSON old/new values.

## 3.1.2 Lapsation Monitoring Module

### NAP Importer Stream Engine

- Status: [❌ Missing]
- Found In: N/A
- Corrected Assessment: No importer or CSV stream pipeline was found for lapsation ingestion. The original report cited `backend/src/workers/lapsation.worker.ts`, but that file does not exist in this repo.

### At-Risk Threshold Logic

- Status: [✅ Verified]
- Found In: [backend/src/jobs/at-risk-scanner.job.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/jobs/at-risk-scanner.job.ts:9)
- Corrected Assessment: Verified. There is a scheduled scanner that marks records as at risk using a 30-day age threshold.

### Reinstatement Tracking

- Status: [⚠️ Incomplete]
- Found In: [backend/src/shared/db/schema/lapsation-records.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/shared/db/schema/lapsation-records.ts:4)
- Corrected Assessment: Not fully missing. The schema already has `reinstatedAtUtc`, but no workflow was found that updates it from import data or reversal events.

### Metric Aggregation

- Status: [⚠️ Incomplete]
- Found In: [backend/src/services/metrics.service.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/services/metrics.service.ts:26)
- Corrected Assessment: The original report cites a non-existent `performance-metrics.service.ts`. The actual metrics service performs summary aggregation for the dashboard, but it does not implement the broader branch-vs-agent rollups described in the audit.

### Agent Email Hooks

- Status: [⚠️ Incomplete]
- Found In: [backend/src/jobs/at-risk-scanner.job.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/jobs/at-risk-scanner.job.ts:24)
- Corrected Assessment: Notification queueing exists, but recipients are hardcoded to `agent@a1prime.local` instead of being resolved from related agent/user records.

## 3.1.3 Agent Performance Tracker Module

### Persistency Data Models

- Status: [✅ Verified]
- Found In: [backend/src/shared/db/schema/performance-metrics.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/shared/db/schema/performance-metrics.ts:5)
- Corrected Assessment: Verified. The schema persists monthly metrics with agent linkage and `recordMonth`.

### APE Processing Engine

- Status: [❌ Missing]
- Found In: N/A
- Corrected Assessment: No dedicated APE processing logic or importer was found.

### Unified Agent View UI

- Status: [⚠️ Incomplete]
- Found In: [frontend/src/app/dashboard/agents/[id]/page.tsx](C:/Users/layma/Documents/GitHub/client-reassignment-system/frontend/src/app/dashboard/agents/[id]/page.tsx:1), [backend/src/services/agents.service.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/services/agents.service.ts:71)
- Corrected Assessment: There is an agent profile page and audit trail support, but no unified client-plus-performance rollup view was found.

### Recruitment KPI Processing

- Status: [❌ Missing]
- Found In: N/A
- Corrected Assessment: No recruitment KPI ingestion or tenure-processing workflow was found.

### Leaderboard Components

- Status: [⚠️ Incomplete]
- Found In: [frontend/src/app/dashboard/performance/page.tsx](C:/Users/layma/Documents/GitHub/client-reassignment-system/frontend/src/app/dashboard/performance/page.tsx:49)
- Corrected Assessment: The leaderboard UI exists, but it is powered by hardcoded mock rows rather than API data.

### Monthly UI Filters

- Status: [⚠️ Incomplete]
- Found In: [frontend/src/features/metrics/components/metrics-page-client.tsx](C:/Users/layma/Documents/GitHub/client-reassignment-system/frontend/src/features/metrics/components/metrics-page-client.tsx:21), [frontend/src/app/dashboard/performance/page.tsx](C:/Users/layma/Documents/GitHub/client-reassignment-system/frontend/src/app/dashboard/performance/page.tsx:5)
- Corrected Assessment: The original report overstates this as completely missing. Month/year filtering already exists for the metrics dashboard, but not for the separate performance leaderboard page.

## 3.1.4 Document Repository Module

### Document Library Drizzle Tables

- Status: [✅ Verified]
- Found In: [backend/src/shared/db/schema/document-library.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/shared/db/schema/document-library.ts:4)
- Corrected Assessment: Verified. The table exists and stores uploader, file URL, category, MIME type, and version.

### Role-based Storage Access

- Status: [⚠️ Incomplete]
- Found In: [backend/src/routes/documents.routes.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/routes/documents.routes.ts:10)
- Corrected Assessment: Upload generation is role-restricted to `Admin` and `BranchManager`, but document listing is available to any authenticated user. If reads should be role-scoped, this is incomplete.

### Deep Version Control

- Status: [❌ Missing]
- Found In: [backend/src/services/documents.service.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/services/documents.service.ts:23)
- Corrected Assessment: Only a fixed `'1.0'` version is inserted. There is no revision lineage, replacement tracking, or semantic version increment logic.

### Pinning Feature

- Status: [❌ Missing]
- Found In: [backend/src/shared/db/schema/document-library.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/shared/db/schema/document-library.ts:4), [frontend/src/app/dashboard/documents/page.tsx](C:/Users/layma/Documents/GitHub/client-reassignment-system/frontend/src/app/dashboard/documents/page.tsx:39)
- Corrected Assessment: The backend has no `isPinned` field, while the frontend currently renders pinned states from static mock data.

### Contextual Links

- Status: [✅ Verified]
- Found In: [backend/src/routes/documents.routes.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/routes/documents.routes.ts:23)
- Corrected Assessment: Verified. Category-based document filtering exists at the route/service level.

## 3.1.5 Notification System

### Gmail OAuth 2.0 Automation

- Status: [⚠️ Incomplete]
- Found In: [backend/src/services/cosaf-approvals.service.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/services/cosaf-approvals.service.ts:31), [backend/src/jobs/at-risk-scanner.job.ts](C:/Users/layma/Documents/GitHub/client-reassignment-system/backend/src/jobs/at-risk-scanner.job.ts:24)
- Corrected Assessment: Queue-based notification calls exist, but recipient resolution and richer dynamic templates are still thin. The current implementation proves queue usage, not a complete end-to-end business notification system.

### Admin Send Logs Panel

- Status: [❌ Missing]
- Found In: N/A
- Corrected Assessment: No admin-facing email dispatch panel was found in the frontend. Audit storage exists generally, but there is no dedicated UI for message send logs.

## Priority Recommendations

1. Fix the orphan-client requirement at the data-contract level first.
   Because `assignedAgentId` is non-null and shared schemas also assume required assignment, the resignation/orphan workflow needs a coordinated schema, API, and migration change before listeners or automation can work.

2. Add real recipient resolution before expanding notification coverage.
   Several flows already enqueue mail jobs, but they all hardcode a placeholder address. Resolve recipients from agent and user ownership data first, then add more triggers.

3. Replace mock-driven dashboard surfaces with API-backed views.
   The performance leaderboard and document repository pages currently advertise capabilities that the backend does not fully support. Aligning UI with live data will reduce feature drift and make future gaps more visible.
