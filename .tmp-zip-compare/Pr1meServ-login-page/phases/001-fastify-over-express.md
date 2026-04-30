# ADR 001: Fastify over Express for the API Layer

**Date:** 2026-04-20  
**Status:** Accepted  
**Deciders:** Backend team

---

## Context

We needed an HTTP framework for the A1 Prime backend. The two primary candidates were Express (the de-facto Node.js standard) and Fastify (a performance-first alternative). The system handles insurance branch operations with authenticated agents, branch managers, and admins — meaning throughput under concurrent requests matters.

## Decision

We chose **Fastify v5**.

## Reasons

1. **Schema-first validation** — Fastify's native JSON Schema integration (and our Zod adapter) validates request/response payloads at the route level with no extra middleware. Express requires `express-validator` or manual wiring.
2. **Performance** — Fastify benchmarks at 2–3× Express throughput for JSON serialization-heavy routes like `/client-profiles` and `/metrics`.
3. **Plugin ecosystem** — `@fastify/jwt`, `@fastify/rate-limit`, `@fastify/multipart`, and `@fastify/cors` are first-party, maintained, and typed. Express equivalents are community-fragmented.
4. **Type safety** — Fastify's TypeScript generics on `request.body`, `request.params`, and `request.query` eliminate the need for manual casting. Our `authUser` decoration on `FastifyRequest` is a clean pattern.
5. **Lifecycle hooks** — `preHandler`, `onError`, and `onSend` hooks compose cleanly for our auth middleware (`requireRole`) and error handler pattern.

## Consequences

- All route files use `FastifyPluginAsync` — no Express middleware is compatible without wrapping.
- Error handling is centralised in `setErrorHandler` in `app.ts` — all services throw typed `AppError` subclasses.
- `@fastify/jwt` owns JWT verify/sign — no third-party JWT middleware needed.

## Alternatives Considered

| Option  | Reason Rejected                                                                             |
| ------- | ------------------------------------------------------------------------------------------- |
| Express | Slower JSON serialization; no built-in schema validation; untyped by default                |
| Hono    | Excellent edge performance but immature ecosystem for server-side BullMQ integration        |
| NestJS  | Too opinionated for our lean service layer; decorator overhead; harder to test in isolation |
