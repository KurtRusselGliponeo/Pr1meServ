# Query Performance Plan

This repository now includes:

- full-text search on `ClientProfiles.SearchVector` via `009_ClientProfilesSearchIndex`
- composite and partial query-serving indexes via `010_QueryPerformanceIndexes`
- SQL-side metrics aggregation for dashboard metrics
- an `npm run analyze:queries --workspace=backend` script to run `EXPLAIN ANALYZE` on the key listing and aggregation paths

The main target queries are:

- client profile listing and search
- metrics aggregation by month
- leaderboard support joins for lapsation counts

Recommended rollout order:

1. Run `npm run migrate:phase1:up --workspace=backend`
2. Run `npm run analyze:queries --workspace=backend`
3. Compare plans before and after real production-like seed data
4. Tune `DB_POOL_MAX` and `DB_USE_PGBOUNCER` per deployment environment
