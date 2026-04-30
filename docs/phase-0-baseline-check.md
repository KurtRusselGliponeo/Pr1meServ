# Phase 0: Baseline Check and Problem Confirmation

This phase stays focused on diagnosis only. No UI redesign work is included here.

## Scope completed

- Confirmed the frontend and backend startup paths and the current auth flow.
- Confirmed the current dashboard navigation strategy and where prefetching happens.
- Added a reusable Playwright baseline spec at `frontend/tests/phase-6/performance/phase0-baseline.spec.ts`.
- Captured real environment findings from the local stack in this workspace.

## What was confirmed

### 1. Frontend startup is the first major bottleneck in this environment

- `http://localhost:8080/health` becomes available while `http://localhost:3000/login` still does not return within 60 seconds.
- `netstat` shows the frontend dev server is listening on port `3000`, so the problem is not "server never started"; it is "server is not serving the login page promptly."
- This means the slowest part of the cold path is currently frontend readiness or first page compilation, not API health.

### 2. Login and dashboard settling are affected by auth restoration

- `frontend/src/features/identity/context/auth-context.tsx` restores the stored user first, then triggers `refreshUser()` whenever there is no in-memory user.
- `refreshUser()` can call `/auth/refresh` and `/auth/me` before the dashboard can settle.
- `frontend/src/features/role-dashboard/components/dashboard-role-home.tsx` blocks the home experience behind `isHydrated || isRestoringSession` and shows a broad skeleton while auth is settling.

### 3. Dashboard navigation currently prefetches every sidebar route

- `frontend/src/components/layouts/dashboard-sidebar.tsx` calls `router.prefetch(...)` for every available navigation item inside an effect.
- The links also keep `prefetch` enabled individually.
- This creates eager route work during shell mount and may compete with first-usable dashboard time on slower machines or cold dev sessions.

### 4. Page transitions intentionally wait

- `frontend/src/components/ui/dashboard-page-transition.tsx` uses `AnimatePresence` with `mode="wait"`.
- That means the outgoing page finishes its exit before the next page fully enters, which can make navigation feel slower even when network time is acceptable.

### 5. Several dashboard surfaces block on multiple queries before showing real content

- `frontend/src/features/role-dashboard/components/admin-home.tsx` waits on notification logs plus on-demand search hooks.
- `frontend/src/features/role-dashboard/components/bm-home.tsx` waits on both leaderboard and orphan-client queries.
- `frontend/src/features/phase-5-performance/components/performance-page-client.tsx` waits on three queries before rendering the main dashboard.
- `frontend/src/features/phase-2-bm-workflow/components/cosaf-page-client.tsx` uses a full skeleton during pending states, though it does at least keep previous page data for pagination.

## Measured slow points

These are the measured results from this local environment on 2026-04-28:

- API health readiness: available at `http://localhost:8080/health` after local startup.
- Login page readiness: not returned within a 60 second probe even though port `3000` was listening.
- Dashboard shell usable: pending a second live browser pass, blocked by the login-page readiness issue above.
- Major dashboard page switch timing: pending a second live browser pass, blocked by the login-page readiness issue above.

## Working hypothesis for the biggest slowdown

The dominant current slowdown appears to be frontend cold-start readiness. After that, the next most likely contributors are:

- auth/session restoration delaying dashboard settling
- eager route prefetching on sidebar mount
- page transitions that wait for exit animations
- pages that block on multiple queries before showing stable content

The backend does not appear to be the first blocker in this environment because `/health` is already responsive while `/login` is still stalled.

## Commands run for verification

```powershell
git status --short
Get-ChildItem -Force
Get-ChildItem -Path frontend -Recurse -File | Select-Object -ExpandProperty FullName
Get-Content package.json
Get-Content frontend\package.json
Get-Content backend\package.json
npm run dev
npm run dev --workspace=frontend
Invoke-WebRequest -Uri http://localhost:8080/health -UseBasicParsing
Invoke-WebRequest -Uri http://localhost:3000/login -UseBasicParsing
netstat -ano | findstr :3000
netstat -ano | findstr :8080
```

## Environment or setup requirements discovered

- Root `npm run dev` needed elevated execution in this environment because the initial sandboxed run failed with `spawn EPERM`.
- The backend could start and answer `/health` using the current `.env`.
- The frontend dev server could bind to port `3000`, but serving `/login` remained too slow to complete the full live browser timing pass.
- Existing admin credentials are already documented in tests and `.env.example`:
  - email: `admin@a1prime.com`
  - password: `Admin123!`

## Pending

- Run `frontend/tests/phase-6/performance/phase0-baseline.spec.ts` against a frontend session where `/login` serves successfully.
- Record exact measured timings for:
  - dev start to login visible
  - login submit to dashboard usable
  - dashboard page-to-page switches
- Capture which major pages feel slowest in real browser interaction once the login route is serving.

## Suggestions for Phase 1

- Prioritize frontend cold-start readiness first, because it currently dominates the user-visible wait.
- Review whether font loading, first compile cost, or another server-side startup task is blocking `/login`.
- Keep the dashboard shell visible while page content refreshes instead of gating large surfaces behind full-page skeletons.
- Revisit aggressive sidebar prefetching and stagger it or scope it to likely-next routes.
