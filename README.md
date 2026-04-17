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

### 2. Start local infrastructure

```bash
npm run db:up
```

Expected healthy state:
- PostgreSQL container is running
- Redis container is running

### 3. Run migrations

```bash
npm run db:migrate:phase1
npm run migrate:validate --workspace=backend
```

Expected healthy state:
- Migration runner completes without constraint errors
- Validation command reports `status: "ok"`

### 4. Start the API

```bash
npm run dev:backend
```

Expected healthy state:
- Fastify starts on the configured port
- `GET /health` returns database and Redis status
- `GET /api/v1/diagnostics/startup` returns migration and queue diagnostics

### 5. Start background workers

```bash
npm run dev:worker --workspace=backend
```

Expected healthy state:
- Worker process logs startup successfully
- Worker heartbeat appears in startup diagnostics when Redis is enabled

### 6. Start the frontend

```bash
npm run dev:frontend
```

Expected healthy state:
- Frontend loads the dashboard and can reach the backend API

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

If the startup diagnostics endpoint is degraded:
- confirm PostgreSQL and Redis are running
- confirm the worker process is started
- confirm migrations have been applied
- inspect recent backend and worker logs for queue or constraint failures

## Planning Artifacts

- [Operational Recovery Execution Pack](./OPERATIONAL_RECOVERY_EXECUTION_PACK.md)
