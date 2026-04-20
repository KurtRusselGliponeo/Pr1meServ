# ADR 003: BullMQ for Background Job Queue

**Date:** 2026-04-20  
**Status:** Accepted  
**Deciders:** Backend team

---

## Context

A1 Prime needs a reliable background job queue for:
- Outbound email delivery (reassignment notifications, password resets, COSAF approvals)
- Performance import processing (NAP, PER, APE, REC files — up to 450 rows per batch)

The queue must survive process restarts, support retry-with-backoff, and be observable.

## Decision

We chose **BullMQ v5** backed by **Redis**.

## Reasons

1. **Redis persistence** — Jobs survive API server restarts. In-memory queues (like `p-queue`) lose jobs on crash.
2. **Typed job names and payloads** — BullMQ's TypeScript generics let us define `NotificationQueueJobs` and `ImportQueueJobs` as discriminated unions. The worker processor is fully typed at the `job.name` switch level.
3. **Retry with exponential backoff** — Configured per queue (`attempts: 3`, `backoff: exponential`). The email queue recovers from transient SMTP failures without manual intervention.
4. **Worker heartbeat** — We write a Redis key every 30 seconds from the worker process. The `/diagnostics/startup` endpoint reads this to detect stale or missing workers — a pattern not available with in-process queues.
5. **BullMQ Board** (future) — Drop-in Bull Board UI for job monitoring without custom tooling.
6. **Concurrency control** — The import worker runs at `concurrency: 3` to avoid overwhelming the database during large APE batch imports.

## Consequences

- Redis is a required infrastructure dependency. In non-production environments, `REDIS_ENABLED=false` falls back to in-memory rate limiting and skips queue operations gracefully.
- The email worker and import worker run as a separate Node.js process (`src/jobs/worker.ts`) — not in-process with the API server. This prevents long-running import jobs from blocking request handling.
- Job payloads are validated with Zod schemas (`EmailQueuePayloadSchema`, `NapImportJobPayloadSchema`, etc.) before enqueueing — invalid jobs are rejected at enqueue time, not at processing time.

## Alternatives Considered

| Option | Reason Rejected |
|---|---|
| `node-cron` + direct DB calls | No retry, no persistence, no observability |
| AWS SQS | Adds cloud vendor dependency; local dev requires mocking |
| `pg-boss` | PostgreSQL-backed queue — good alternative, but adds write load to the primary DB during high-throughput imports |
| Inngest | Excellent DX but requires an external service for the event bus |
