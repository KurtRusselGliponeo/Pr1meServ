# ADR 002: Drizzle ORM over Prisma

**Date:** 2026-04-20  
**Status:** Accepted  
**Deciders:** Backend team

---

## Context

The application requires a PostgreSQL ORM that supports transactions, typed queries, and migration management. Prisma and Drizzle were the two most mature TypeScript-first options at the time of evaluation.

## Decision

We chose **Drizzle ORM v0.38**.

## Reasons

1. **SQL-first mental model** — Drizzle queries read like SQL (`select().from().where().orderBy()`). Our team can reason about query plans and add EXPLAIN ANALYZE directly without translating Prisma's abstraction layer.
2. **No code generation step** — Prisma requires `prisma generate` on every schema change and in every CI environment. Drizzle schema is plain TypeScript — `import { userAccounts } from './schema'` and you're done.
3. **Transaction composability** — `withDbTransaction` accepts a `DbTransaction` argument that passes through to service sub-calls. Prisma's `$transaction` API is harder to compose across service boundaries without exposing the Prisma client directly.
4. **Raw SQL escape hatch** — Our migrations need `CREATE INDEX CONCURRENTLY`, partial indexes, GIN indexes, and CHECK constraints. Drizzle's `sql.unsafe()` handles this cleanly. Prisma's raw SQL is less ergonomic with migrations.
5. **Bundle size** — Drizzle adds ~30 KB to the backend bundle. Prisma's query engine is a native binary (~10 MB) deployed alongside the app.
6. **Explicit over implicit** — Drizzle never silently issues N+1 queries. Every join is explicit. This matters for the `listClientProfiles` and `getAgentProfile` queries.

## Consequences

- Migrations are hand-written SQL files (migrations 001–009). This is intentional — it gives us full control over index strategy, constraint naming, and rollback behaviour.
- The Drizzle schema in `src/shared/db/schema/` is the single source of truth for TypeScript types.
- `drizzle-kit` is used only for `drizzle-kit push` in development. Production uses the custom runner in `migrations/runner.ts`.

## Alternatives Considered

| Option            | Reason Rejected                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| Prisma            | Code-generation step in CI; native binary deployment; harder raw-SQL ergonomics for our migration strategy |
| TypeORM           | Decorator-heavy; poor tree-shaking; active development has slowed                                          |
| Knex              | No TypeScript inference on query results without manual typing                                             |
| Raw `postgres.js` | No schema introspection or typed query builder                                                             |
