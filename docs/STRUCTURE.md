# BMAOPS Structure

## Monorepo Layout

```text
.
|-- backend/
|   |-- drizzle.config.ts
|   |-- src/
|   |   |-- app.ts
|   |   |-- modules/
|   |   |   |-- cosaf/
|   |   |   \-- identity/
|   |   |-- scripts/
|   |   \-- shared/
|   |       |-- db/
|   |       |   |-- client.ts
|   |       |   |-- migrations/
|   |       |   |   |-- 001_UserAccounts.ts
|   |       |   |   |-- 002_AgentProfiles.ts
|   |       |   |   |-- 003_ClientProfiles.ts
|   |       |   |   |-- 004_PerformanceMetrics.ts
|   |       |   |   |-- 005_SystemAuditLogs.ts
|   |       |   |   |-- generated/
|   |       |   |   |-- index.ts
|   |       |   |   \-- runner.ts
|   |       |   \-- schema/
|   |       |       |-- agent-profiles.ts
|   |       |       |-- client-profiles.ts
|   |       |       |-- performance-metrics.ts
|   |       |       |-- system-audit-logs.ts
|   |       |       |-- user-accounts.ts
|   |       |       \-- index.ts
|   |       |-- lib/
|   |       \-- types/
|   \-- tsconfig.json
|-- frontend/
|   |-- middleware.ts
|   |-- next.config.ts
|   |-- src/
|   |   |-- app/
|   |   |-- components/
|   |   |-- features/
|   |   |-- lib/
|   |   \-- styles/
|   \-- tsconfig.json
|-- packages/
|   \-- schemas/
|       |-- package.json
|       |-- tsconfig.json
|       \-- src/
|           \-- index.ts
|-- docs/
|-- tooling/
|-- package.json
|-- tsconfig.base.json
\-- STRUCTURE.md
```

## Directory Decisions

- `packages/schemas` is the isomorphic workspace for Zod schemas and shared domain constants used by both the Fastify backend and the Next.js frontend.
- `backend/src/shared/db/schema` is the single source of truth for Drizzle table definitions.
- `backend/src/shared/db/migrations/generated` is reserved for `drizzle-kit generate` output.
- `backend/src/shared/db/migrations/*.ts` contains explicit `up()`/`down()` migration modules for Phase 1.
- `backend/src/modules/*/*.schema.ts` re-export table definitions from the shared DB schema layer so existing feature code can keep stable import paths.
