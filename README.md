# Client Reassignment System

Starter setup for a React frontend and Express backend so the team can begin building features without locking in the ERD yet.

## Tech Stack

- Frontend: React, TypeScript, Vite, React Router, Axios, Tailwind CSS
- Backend: Node.js, Express, TypeScript, Supabase client, CORS, dotenv

## Project Structure

```text
client/
  src/
    components/
    config/
    features/
    layouts/
    lib/
    pages/
server/
  src/
    config/
    controllers/
    lib/
    routes/
```

## Environment Files

Create local env files from the examples before running the apps:

- `client/.env.example`
- `server/.env.example`

## Common Commands

From the repository root:

```bash
npm run dev:client
npm run dev:server
npm run build
npm run typecheck
```

If you want a single install pass later, run `npm install` in the root after regenerating a root lockfile or continue using the existing package installs inside `client/` and `server/`.

## Current API Surface

The backend intentionally exposes only neutral setup endpoints for now:

- `GET /api/v1/health`
- `GET /api/v1/meta`

That keeps the project ready to code while leaving tables, relationships, and business workflows open for your ERD decisions.
