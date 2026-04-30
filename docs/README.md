# A1 Prime Branch Management

Operational monorepo for the A1 Prime branch workflow platform. The current stack is a Next.js frontend, a Fastify backend, shared schemas, PostgreSQL, and BullMQ workers backed by Redis.

## Workspace Layout

```text
backend/    Fastify API, workers, services, DB schema, migrations
frontend/   Next.js app and role-based feature surfaces
packages/   Shared schemas and cross-workspace contracts
```

## Environment

Copy the root environment file from `.env.example` and set the values required by PostgreSQL, Redis, JWT, and any mail/storage integrations.

## Local Runbook

### 1. Install dependencies

```bash
npm install
```

Expected healthy state:

- root, `frontend`, and `backend` dependencies install without workspace errors
- use Node `>=20` and npm `>=10`
- copy `.env.example` to `.env` before running API, migrations, seeds, or workers

### 2. Start local infrastructure

```bash
npm run db:up
```

Expected healthy state:

- PostgreSQL container is running
- Redis container is running
- set `REDIS_ENABLED=true` in `.env` if you want real queue and worker behavior locally; the example env keeps Redis in degraded local-fallback mode

### 3. Run migrations

```bash
npm run db:migrate:phase1
npm run migrate:validate --workspace=backend
```

Expected healthy state:

- Migration runner completes without constraint errors
- Validation command reports `status: "ok"`
- migrations are applied before starting the worker so queue processors do not boot against an older schema

### 4. Start the API

```bash
npm run dev:backend
```

Expected healthy state:

- Fastify starts on the configured port
- `GET http://127.0.0.1:8080/health` returns database and Redis status
- `GET http://127.0.0.1:8080/api/v1/diagnostics/startup` returns migration and queue diagnostics
- with `REDIS_ENABLED=false`, the startup diagnostics endpoint is expected to return `503` with `status: "degraded"` even when the API and DB are otherwise usable for a local demo

### 5. Start background workers

```bash
npm run dev:worker --workspace=backend
```

Expected healthy state:

- Worker process logs startup successfully
- Worker heartbeat appears in startup diagnostics when Redis is enabled
- if Redis is unavailable, the local demo is still acceptable for read-only UI walkthroughs, but async mail/import processing is degraded

### 6. Start the frontend

```bash
npm run dev:frontend
```

Expected healthy state:

- Frontend responds on `http://127.0.0.1:3000`
- Login loads without hanging on a blank shell
- Dashboard chrome renders and API-backed modules either load content or show visible inline errors

## Local Demo Baseline

A local run is good enough for demo when all of the following are true:

- frontend opens at `http://127.0.0.1:3000`
- backend health endpoint is healthy
- startup diagnostics are either fully healthy, or explicitly degraded only because queue or integration dependencies are intentionally disabled for the demo
- dashboard login succeeds for at least one seeded role account
- core routes render: overview, COSAF, documents, performance, prospects
- database-backed pages show data or explicit inline errors, not endless spinners
- worker-dependent actions are called out as degraded if Redis, Gmail, or storage integrations are unavailable

## Demo Accounts And Seed Data

Seed commands currently available:

```bash
npm run seed:admin --workspace=backend
npm run seed:demo --workspace=backend
npm run seed:a1prime --workspace=backend
```

Use these after migrations complete. Current script behavior:

- `seed:admin`: creates or refreshes one admin account from `ADMIN_*` env vars
- `seed:demo`: creates one Admin, one BranchManager, one Agent, plus sample prospects
- `seed:a1prime`: creates a fuller branch demo with branch manager, multiple agents, client profiles, COSAF approvals, lapsation data, notifications, and prospects

Current seeded credentials confirmed from the repo:

- `seed:admin`: `admin@a1prime.com / Admin123!` unless overridden in `.env`
- `seed:demo`: `admin.demo@prulife.com / Admin123!`, `bm.demo@prulife.com / BM123456`, `agent.demo@prulife.com / AG123456`
- `seed:a1prime`: branch manager `plukma.santos@gmail.com / A1Prime2024!` plus multiple agent accounts using the same password

## Integration Dependencies

- Gmail / outbound mail: worker features can start without it, but delivery flows should be treated as degraded unless the relevant mail env vars are configured
- Storage providers: the example env points `DOCUMENT_STORAGE_PROVIDER=R2`; document upload and signed-download flows should be treated as degraded until matching storage credentials are configured
- Redis: required for BullMQ queues and worker-backed processing, and the worker process will not start successfully unless `REDIS_ENABLED=true` and Redis is reachable
- PostgreSQL: required for any meaningful local demo

## Useful Commands

```bash
npm run dev
npm run typecheck:all
npm run lint:all
npm run test:api --workspace=backend
npm run test:unit --workspace=backend
```

## Diagnostics and Recovery Checks

- `GET /health`: fast DB and Redis availability check
- `GET /api/v1/diagnostics/startup`: startup readiness, queue status, worker heartbeat, and migration constraint validation
- dashboard route check: open `/dashboard`, `/dashboard/cosaf`, `/dashboard/documents`, `/dashboard/performance`, and `/dashboard/prospects`

If the startup diagnostics endpoint is degraded:

- confirm PostgreSQL and Redis are running
- confirm the worker process is started
- confirm migrations have been applied
- inspect recent backend and worker logs for queue or constraint failures

If integrations are degraded but the core demo must proceed:

- continue with login, navigation, and read-only module checks
- avoid promising email delivery, background imports, or cloud document persistence

## Planning Artifacts

- [Operational Recovery Execution Pack](./OPERATIONAL_RECOVERY_EXECUTION_PACK.md)
