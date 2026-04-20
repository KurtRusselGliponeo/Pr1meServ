# Phase 1 Migration Workflow

## Local Infrastructure

Start the local verification stack:

```bash
npm run db:up
```

Set the backend environment to the local database before running migration checks:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/a1prime_local
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

## Phase 1 Verification Commands

Apply the explicit Phase 1 up-migrations:

```bash
npm run db:migrate:phase1
```

Verify rollback behavior:

```bash
npm run db:rollback
npm run db:migrate:phase1
```

This workflow validates that the manual down-migrations remove the Phase 1 tables, B-Tree indexes,
partial indexes, GIN indexes, and foreign keys before the schema is recreated.
