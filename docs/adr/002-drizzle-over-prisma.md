# ADR 002: Drizzle Over Prisma

Drizzle is used for schema ownership and migrations because it keeps SQL close to the codebase, fits the existing typed migration workflow, and gives more control over PostgreSQL-specific optimizations.
