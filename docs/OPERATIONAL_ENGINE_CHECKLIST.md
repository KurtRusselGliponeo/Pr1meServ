# Deep Operational Engine & Middle Layer Checklist

This checklist acts as your roadmap to build the **backend services, queue workers, and route controllers** necessary to transform your system schemas and visually stunning UI dashboards into fully operational applications.

## 1. COSAF Form Upload Pipeline (Document Repository Integration)
- `[x]` **S3 Pre-signed URL Generator Endpoint** (`POST /documents/presigned-url`):
  - Requires Zod schema mapping `{ filename: string, mimeType: string, category: DocumentCategory }`.
  - Service injects the `.getSignedUrl(s3Client, PutObjectCommand)` using AWS SDK v3.
  - Returns dynamically generated `uploadUrl` to safely upload large payloads.
- `[x]` **COSAF Form Submission Webhook** (`POST /client-profiles/:id/submit-forms`):
  - Accepts the `documentId` from the completed S3 upload interface in front-end.
  - Updates `ClientProfiles.caseStatus` from `Contacted` to `For Approval`.
  - Audits the lifecycle jump securely tracking document assignments within `SystemAuditLogs`.
- `[x]` **Document Fetches Router** (`GET /documents`):
  - Service parameters executing targeted fetches specifically for Drizzle schema mapping `eq(documentLibrary.category, 'COSAF')`.

## 2. Branch Manager Approval Logic (Middle Layer Routes)
- `[x]` **Approve Client Form Route** (`POST /cosaf-approvals/:id/approve`):
  - Service must invoke `db.transaction()` locking system states:
    1. Re-assign `assignedAgentId` ownership officially.
    2. Update `ClientProfiles.caseStatus` tracking enum to `BM Signed`.
    3. Update `CosafApprovals` state to `APPROVED`, locking edits natively.
  - Triggers a BullMQ `send-email` to instantly alert the designated Agent via new Gmail transport framework.
- `[x]` **Reject / Return Form Route** (`POST /cosaf-approvals/:id/reject`):
  - Service strictly validating `Zod.string().min(10)` mandatory rejection text field input.
  - Auto-updates `ClientProfiles.caseStatus` reversing back to `Returned`.
  - Queues an agent exception payload strictly detailing the rejection reason inside an outbound Email string.
  - System persists the text-reason inherently limiting loss via historical audit logging tracking.

## 3. Lapsation Parser Engine (Background Automation)
- `[x]` **NAP Import BullMQ Worker** (`src/jobs/lapsation.worker.ts`):
  - Configure a fast-csv streamer scanning dynamically uploaded NAP batches.
  - Native logic conditions: Filter mappings verifying `Transaction_Type === LAPSE` and `Credit_Status === Debit` specifically inserting states into the nested `LapsationRecords` table.
- `[x]` **At-Risk Threshold Daily Scanner CRON** (`src/jobs/at-risk-scanner.job.ts`):
  - Execute a node-cron trigger set looping raw SQL `DATEDIFF(NOW(), profile.createdAt) > Configuration.Threshold` automatically matching policies to extreme risk timelines.
  - Triggers updating matched limits to `CRITICAL` state.
  - Executes Notification triggers securely bypassing the main loop cycle.

## 4. Leaderboard Data Aggregation Hook
- `[x]` **API Rollup Service** (`src/services/metrics.service.ts`):
  - Structuring an internal API exposing a `.groupBy(performanceMetrics.agentId)` returning dynamic groupings scaling arrays based natively on `YtdSurplus` sums.
  - Limit returned sorting to `Top 10` automatically filtering and sorting API arrays on response loads.
- `[x]` **Recruitment KPI Linker**:
  - Expose API sub-schemas generating fractional joins linking `AgentProfiles` active columns verifying 'tenure' timelines against imported KPI values.

## 5. Security & Gmail Oauth Refresher
- `[x]` **BullMQ Email Wrapper Integrator** (`src/services/email-queue.service.ts`):
  - Handle deep mapping templatable triggers extracting parameters such as dynamically bound `policyNumber` configurations automatically linking users back safely into S3-generated secure links.
  - **Token Expiry Failsafe**: Construct an explicit interceptor executing Google `oauth2Client.refreshAccessToken()` catching expiring Gmail token constraints naturally mid-job and continuing process executions autonomously.
