# Exhaustive Core Modules Implementation Plan

This plan comprehensively addresses the missing pieces for the 5 Client Needs: **Lapsation Tracker, Document Repository, Notifications (Gmail OAuth), COSAF Approvals, and Performance Leaderboards**.

---

## Phase 0 — Project Setup & Configuration
- `[x]` Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` via `npm install --workspace=backend` for Document Repository uploads `🔍 TECH LEAD APPROVAL`
- `[x]` Install `googleapis` via `npm install --workspace=backend` to replace standard SMTP with Gmail OAuth 2.0 flow `🔒 SECURITY`

---

## Phase 1 — Database Layer
- `[x]` Create Drizzle schema `backend/src/shared/db/schema/lapsation-records.ts`
  - `[x]` Add FK to `ClientProfiles.Id` (`policyNumber`)
  - `[x]` Add B-Tree Index on FK (Criteria §2.1)
  - `[x]` Add `IsAtRisk`, `ReinstatedAtUtc`, and `LapseDate` timestamps
- `[x]` Create Drizzle schema `backend/src/shared/db/schema/document-library.ts`
  - `[x]` Add `fileUrl`, `category`, `mimeType`, and `version` columns
  - `[x]` Add FK to `uploadedByUserId` with respective B-Tree index (Criteria §2.1)
- `[x]` Create Drizzle schema `backend/src/shared/db/schema/cosaf-approvals.ts`
  - `[x]` Add FK to `ClientProfiles.Id` and `UserAccounts.Id` (Reviewing BM) with B-Tree indices (Criteria §2.1)
  - `[x]` Add `status` enum (`PENDING`, `APPROVED`, `REJECTED`)
- `[x]` Modify `backend/src/shared/db/schema/performance-metrics.ts`
  - `[x]` Add `recruitmentCount` INT to track REC_2025 data imports
  - `[x]` Add `ytdSurplus` (DECIMAL(19,4)) to enforce monetary tracking consistency `⚡ PERFORMANCE`

---

## Phase 2 — Backend Core
- `[x]` Upgrade NodeMailer to Google API OAuth 2.0 `🔒 SECURITY`
  - `[x]` Implement OAuth2 Refresh Token interceptor within `backend/src/shared/mail/mailer.ts`
  - `[x]` Refactor `sendQueuedEmail` to handle OAuth edge-case expirations with Google APIs.

---

## Phase 3 — Backend Features

### Document Repository Endpoints
- `[x]` Generate Signed Upload URL Endpoint `🔒 SECURITY` `⚡ PERFORMANCE`
  - `[x]` Zod schema (`packages/schemas/src/documents.schema.ts`)
  - `[x]` Service method with JSDoc
  - `[x]` Route handler (thin wrapper only)
  - `[x]` Role middleware applied (`Admin`, `BranchManager`)
  - `[x]` Unit test (happy path + top 3 error cases)
  - `[x]` API test (per role)

### Lapsation Tracker Endpoints
- `[x]` Fetch At-Risk Clients Paginated
  - `[x]` Zod schema (limit/offset cursor, max 100) (Criteria §2.1)
  - `[x]` Service method with JSDoc
  - `[x]` Route handler (thin wrapper only)
  - `[x]` Role middleware applied
  - `[x]` Unit test (happy path + top 3 error cases)
  - `[x]` API test (per role)
- `[x]` Execute Reinstatement Routine
  - `[x]` `db.transaction()` wrapper for atomic status toggling (Criteria §3.X)
  - `[x]` Service method with JSDoc pushing a notification payload to BullMQ
  - `[x]` Route handler (thin wrapper only)

### COSAF Approvals
- `[x]` Branch Manager Approval Mutation
  - `[x]` Zod schema validation
  - `[x]` `db.transaction()` for applying ownership swap atomically with system audit log entries
  - `[x]` Service method with JSDoc initiating Gmail OAuth BullMQ trigger
  - `[x]` Unit test, API test

### Performance Leaderboards
- `[x]` Aggregate Top Branches Dashboard
  - `[x]` Zod schema
  - `[x]` Service method generating cross-table `.groupBy()` totals `⚡ PERFORMANCE`
  - `[x]` Route array limiting to top 10 rows safely

---

## Phase 4 — Frontend Core
- `[x]` Define strict Zod types inside `packages/schemas/*` for Lapsation rows, Document rows, and Leaderboard entities so frontend and backend remain strictly typed.
- `[x]` Run TypeScript strict mode checks over the entire workspace.

---

## Phase 5 — Frontend Features

### Lapsation Module (`frontend/src/app/lapsation/page.tsx`)
- `[x]` Build Bento Grid reporting dashboard showing "Total Policies at Risk" vs "Reinstated" `🎨 UI/UX`
- `[x]` Build Paginated Datagrid Component for Lapsation tracking applying modern floating Canva style with pastel gradients.
- `[x]` Ensure accessible, keyboard-navigation compliant touch targets (`♿ Digital Inclusion`)

### Document Repository (`frontend/src/app/documents/page.tsx`)
- `[x]` Build Visual File Library showing PDF/Excel Icons
- `[x]` Add React Dropzone handling S3 pre-signed URL uploads directly from client to Cloudflare R2 bucket `🔒 SECURITY` `⚡ PERFORMANCE`

### COSAF & Performance Expansions
- `[x]` Enhance `app/cosaf/page.tsx` with a pending BM Approval Dialogue containing destructive confirmation barriers.
- `[x]` Enhance `app/performance/page.tsx` with animated Leaderboard visualization utilizing Kinetic typography `🎨 UI/UX`

---

## Phase 6 — Background Jobs & Workers
- `[x]` Build `Lapsation Scanner Daily Job` `⚡ PERFORMANCE`
  - `[x]` Read incoming `NAP`/`PER` streams to auto-detect lapsed accounts natively.
  - `[x]` Send queued payloads to `notification.queue.ts` via BullMQ interface.
- `[x]` Ensure emails never execute inside request cycles (Routing safely through Redis queues unconditionally)
