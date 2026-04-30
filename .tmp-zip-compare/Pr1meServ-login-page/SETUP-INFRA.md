# CI/CD Setup Guide

## GitHub Secrets Required

Add these in: **Settings → Secrets and variables → Actions → New repository secret**

### Vercel (Preview + Production deployments)

| Secret                       | Where to find it                                               |
| ---------------------------- | -------------------------------------------------------------- |
| `VERCEL_TOKEN`               | vercel.com → Account Settings → Tokens → Create                |
| `VERCEL_ORG_ID`              | `vercel.json` or `vercel project ls --json \| jq '.[0].orgId'` |
| `VERCEL_PROJECT_ID_FRONTEND` | Vercel project dashboard → Settings → General → Project ID     |

### AI Code Review

| Secret              | Where to find it                 |
| ------------------- | -------------------------------- |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |

### Backend runtime (used in CI tests)

| Secret           | Value                                            |
| ---------------- | ------------------------------------------------ |
| `JWT_SECRET`     | Any long random string (32+ chars)               |
| `ENCRYPTION_KEY` | 64-character hex string (`openssl rand -hex 32`) |

---

## Vercel Project Setup (one-time)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Link the frontend project
cd frontend
vercel link

# 3. Get your IDs
cat .vercel/project.json
# → { "orgId": "...", "projectId": "..." }
```

Copy `orgId` → `VERCEL_ORG_ID`  
Copy `projectId` → `VERCEL_PROJECT_ID_FRONTEND`

---

## How Preview Environments Work

```
Developer opens PR
       ↓
GitHub Actions triggers preview.yml
       ↓
┌──────────────┬──────────────────┬──────────────┐
│   validate   │   test (unit +   │  ai-review   │
│ (lint/types) │   integration)   │  (Claude)    │
└──────┬───────┴─────────┬────────┴──────┬───────┘
       └─────────────────┼───────────────┘
                         ↓
                  preview-frontend
                         ↓
              Deploys to Vercel Preview
                         ↓
         Posts comment to PR with preview URL
```

Every subsequent push to the PR branch re-runs the pipeline and **updates the existing comment** rather than posting a new one.

---

## ClamAV (optional malware scanning)

The malware scanner works in two tiers:

1. **Magic-byte check** — always active, no setup needed. Validates file signatures against declared MIME types.
2. **ClamAV scan** — activated by setting `CLAMAV_HOST` environment variable.

For local development with Docker:

```bash
docker run -d --name clamav \
  -p 3310:3310 \
  clamav/clamav:latest
```

Then add to your `.env`:

```
CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310
```

In production (Railway / Render / Fly.io), deploy a ClamAV sidecar and set `CLAMAV_HOST` to its internal hostname.

---

## RLS (Row Level Security)

Migration `012_RlsPolicies` creates the policies. To activate RLS for a query:

```typescript
import { withAuthRlsContext } from '@/shared/lib/rls';

// In a route handler:
const profiles = await withAuthRlsContext(request.authUser, async (tx) => {
  return tx.select().from(clientProfiles).where(isNull(clientProfiles.deletedAtUtc));
});
```

**Important:** Existing service code is unaffected — RLS enforcement is **opt-in**.  
The superuser connection bypasses policies unless you explicitly call `withAuthRlsContext`.
