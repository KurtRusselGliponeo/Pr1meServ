# ADR 005: Next.js App Router for the Frontend

**Date:** 2026-04-20  
**Status:** Accepted  
**Deciders:** Frontend team

---

## Context

The A1 Prime dashboard is a role-protected internal tool. The frontend needs:

- Server-side session validation (middleware-level auth guard)
- Role-based route protection
- Fast navigation with persistent layout
- TypeScript-first with strict path types

## Decision

We chose **Next.js 15 with the App Router**.

## Reasons

1. **Middleware-level auth guard** — `middleware.ts` checks the `refresh_token` cookie on every `/dashboard/**` request at the Edge, before React renders. This prevents flash-of-unauthenticated-content without client-side tricks.
2. **Typed routes** — `typedRoutes: true` in `next.config.ts` gives compile-time errors on invalid `href` values in `<Link>` and `router.push()`.
3. **Layout persistence** — The `DashboardShell` in `app/dashboard/layout.tsx` renders once and persists across page navigations. The sidebar, header, and theme context never unmount.
4. **Server Components for static pages** — Pages like `AgentProfilePage` and `CosafPage` are async server components that resolve params before rendering. No client-side param parsing needed.
5. **`useTransition` / `useDeferredValue`** — The COSAF search uses `useDeferredValue` to defer re-renders while the user types, keeping the UI responsive without debounce wiring.
6. **`@tanstack/react-query` on the client** — Data fetching is client-side with React Query. Server Components handle routing and layout only. This gives us full control over cache invalidation after mutations (reassignment, profile updates).

## Consequences

- All interactive components are `'use client'`. Server Components are layouts and page wrappers only.
- The `RoleGuard` component redirects to `/unauthorized` client-side after hydration. The middleware handles the unauthenticated case server-side. Both layers are needed.
- `sonner` is shimmed in `src/shims/sonner.tsx` to use a custom `CustomEvent`-based toast bus, avoiding SSR hydration mismatches from the real `sonner` library.
- `@tanstack/react-table` is shimmed in `src/shims/react-table.ts` with a minimal `ColumnDef` interface to avoid pulling the full table library into the bundle for the current simple table needs.

## Alternatives Considered

| Option               | Reason Rejected                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| Vite + React SPA     | No middleware-level auth; requires a separate routing layer; no typed routes                               |
| Remix                | Excellent data-loading model but fewer UI library integrations; smaller ecosystem for dashboard components |
| Next.js Pages Router | Superseded by App Router; no Server Components; layout persistence is more complex                         |
| Nuxt (Vue)           | Team is TypeScript/React-native; Vue adds context switching overhead                                       |
