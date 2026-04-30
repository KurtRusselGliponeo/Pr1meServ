# Beginner-Friendly Testing Guide

This file explains the testing setup of the project in simple terms. It is meant for beginners who want to understand what tests exist, what command to type, and what each test is checking.

---

## What Is an `.md` File?

An `.md` file is a **Markdown** file.

It is usually used for:

- notes
- guides
- plans
- documentation
- prompt templates

An `.md` file usually does **not** change how the system runs unless:

- a script is reading it on purpose, or
- a developer copies instructions from it and applies them manually

So for files like `ui-planning.md` and this testing guide, they are **documentation only**. They help people understand the project. They do not automatically change the app behavior.

---

## What Types of Testing Exist in This Project?

This project currently has several kinds of checks:

1. `Type checking`
2. `Linting`
3. `Backend unit tests`
4. `Backend integration/API tests`
5. `Frontend unit/component tests`
6. `Frontend end-to-end (E2E) tests`
7. `Performance testing`

Some are not technically "tests" in the strictest sense, but they are still part of quality checking.

---

## 1. Type Checking

### What It Is

Checks TypeScript errors.

### What It Helps Catch

- wrong variable types
- missing properties
- invalid function usage
- broken imports in TypeScript code

### Command

```powershell
npm run typecheck:all
```

### What You Will See

- terminal output
- either success or a list of TypeScript errors

---

## 2. Linting

### What It Is

Checks code style and common code-quality issues.

### What It Helps Catch

- unused variables
- bad patterns
- formatting-related issues
- some logic mistakes flagged by lint rules

### Command

```powershell
npm run lint:all
```

### What You Will See

- terminal output
- either success or a list of lint errors/warnings

---

## 3. Backend Unit Tests

### What It Is

Tests small backend logic in isolation.

### Tool Used

- `Vitest`

### Examples in This Project

- auth service tests
- client profile service tests
- db transaction tests
- email queue tests

### Location

- [backend/src/tests/phase-6/unit](C:/Users/andre/4th%20year-OJT/FIrst%20project/2nd/Pr1meServ/backend/src/tests/phase-6/unit)

### Command

```powershell
npm run test:unit
```

Or backend only:

```powershell
npm run test:unit --workspace=backend
```

### What You Will See

- terminal output showing passed and failed tests

---

## 4. Backend Integration/API Tests

### What It Is

Tests backend routes and API behavior.

### Tool Used

- `Vitest`

### Examples in This Project

- auth routes
- documents routes
- users routes
- metrics routes

### Location

- [backend/src/tests/phase-6/integration](C:/Users/andre/4th%20year-OJT/FIrst%20project/2nd/Pr1meServ/backend/src/tests/phase-6/integration)

### Command

```powershell
npm run test:api
```

Or backend only:

```powershell
npm run test:api --workspace=backend
```

### What You Will See

- terminal output with passing/failing API tests

### Important Note

These may fail if the environment, database, or test setup is incomplete.

---

## 5. Frontend Unit/Component Tests

### What It Is

Tests frontend components without opening the full browser app.

### Tools Used

- `Vitest`
- `Testing Library`
- `jsdom`

### Example in This Project

- [document-upload-modal.test.tsx](C:/Users/andre/4th%20year-OJT/FIrst%20project/2nd/Pr1meServ/frontend/src/features/documents/components/__tests__/document-upload-modal.test.tsx)

### Command

```powershell
npm run test:unit --workspace=frontend
```

### What It Helps Check

- button behavior
- modal behavior
- form interaction
- visible text and UI state changes

### What You Will See

- terminal output with passed and failed component tests

---

## 6. Frontend E2E Tests

### What It Is

E2E means **end-to-end**.

These tests act like a real user:

- open the app
- click buttons
- navigate pages
- log in
- check flows

### Tool Used

- `Playwright`

### Location

- [frontend/tests/phase-6/e2e](C:/Users/andre/4th%20year-OJT/FIrst%20project/2nd/Pr1meServ/frontend/tests/phase-6/e2e)

### Commands

```powershell
npm run e2e
```

Frontend only:

```powershell
npm run test:e2e --workspace=frontend
```

Interactive UI mode:

```powershell
npm run test:e2e:ui --workspace=frontend
```

Debug mode:

```powershell
npm run test:e2e:debug --workspace=frontend
```

### What You Will See

- terminal output
- browser automation
- screenshots/videos on failure
- an HTML report in some cases

### Important Note

These usually need the app to be available at `http://localhost:3000`.

---

## 7. Performance Testing

### What It Is

Checks loading and page performance quality.

### Tool Used

- `Lighthouse`

### Command

```powershell
npm run test:lighthouse --workspace=frontend
```

### What It Helps Check

- load performance
- page best practices
- some accessibility and quality indicators

### Important Note

This is heavier than the other checks and may need the backend and frontend working properly first.

---

## The Easiest Order for Beginners

If you are new, run them in this order:

1. `npm run typecheck:all`
2. `npm run lint:all`
3. `npm run test:unit`
4. `npm run test:api`
5. `npm run e2e`

This order starts with the simplest checks and moves to the more complex ones.

---

## Why Some Tests Might Be Failing

A lot of failures do not always mean your code is bad. Common reasons:

- backend server not running
- frontend server not running
- database not running
- Redis not running
- `.env` values missing or wrong
- seeded users/data missing
- old tests no longer matching the current UI
- route names, text, or selectors changed

---

## Useful Commands in This Project

Run the app:

```powershell
npm run dev
```

Run frontend only:

```powershell
npm run dev:frontend
```

Run backend only:

```powershell
npm run dev:backend
```

Start database services:

```powershell
npm run db:up
```

Stop database services:

```powershell
npm run db:down
```

---

## Simple Rule of Thumb

- `typecheck` checks TypeScript correctness
- `lint` checks code quality and style
- `unit` checks small parts
- `api` checks backend endpoints
- `e2e` checks real user flows
- `lighthouse` checks performance quality

---

## Beginner Advice

- Do not start with E2E first.
- Start with `typecheck` and `lint`.
- If unit tests fail, read the first real error, not all errors at once.
- If E2E fails, check whether the app is running first.
- If API tests fail, check whether database/config setup is complete.

---

## End-of-Testing Report Format

When testing work is done, it is helpful to summarize results like this:

- `Completed:` list of checks that passed
- `Pending:` list of failed tests or blocked test areas
- `Suggestions:` recommended fixes, setup steps, or next checks

This makes the testing result easier to understand, especially for beginners.
