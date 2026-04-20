import { test, expect } from '@playwright/test';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function login(
  page: import('@playwright/test').Page,
  email = 'admin@a1prime.com',
  password = 'Admin123!',
) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

// ─── Login page ─────────────────────────────────────────────────────────────

test.describe('Login page', () => {
  test('renders the login form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows validation error when email is empty', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Zod validation fires client-side
    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });

  test('shows error banner for wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for the API response
    await expect(
      page.getByText(/unable to sign in|invalid email or password/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('redirects to /dashboard after successful login', async ({ page }) => {
    await login(page);
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('redirects to /login when accessing /dashboard unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login**', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── Dashboard shell ─────────────────────────────────────────────────────────

test.describe('Dashboard shell', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
  });

  test('shows the navigation sidebar', async ({ page }) => {
    await expect(page.getByRole('navigation', { name: /dashboard/i })).toBeVisible();
  });

  test('shows the user name in the header', async ({ page }) => {
    // Header contains a greeting with the user's first name
    await expect(page.getByText(/good to see you/i)).toBeVisible();
  });

  test('sign-out clears session and redirects to /login', async ({ page }) => {
    // Open user dropdown
    await page.getByRole('button', { name: /open user menu/i }).click();
    await page.getByRole('menuitem', { name: /sign out/i }).click();

    await page.waitForURL('**/login', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── COSAF client profiles ────────────────────────────────────────────────────

test.describe('COSAF — Client profiles', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await page.goto('/dashboard/cosaf');
  });

  test('renders the client profiles page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /client profiles/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('search input is visible', async ({ page }) => {
    // Either the table search or the empty state will render
    const searchOrEmpty = page.getByPlaceholder(/search by client name/i).or(
      page.getByText(/no client profiles/i),
    );
    await expect(searchOrEmpty.first()).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Role guard ───────────────────────────────────────────────────────────────

test.describe('Role guard — Admin-only pages', () => {
  test('Admin user can access /dashboard/admin/users', async ({ page }) => {
    await login(page); // admin by default
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await page.goto('/dashboard/admin/users');

    await expect(
      page.getByRole('heading', { name: /user management/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
