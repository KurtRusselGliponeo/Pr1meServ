import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page, email = 'admin@a1prime.com', password = 'Admin123!') {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

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
    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });

  test('shows error banner for wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/unable to sign in|invalid email or password/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('redirects to /dashboard after successful login', async ({ page }) => {
    await login(page);
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe('Dashboard shell', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
  });

  test('shows the navigation sidebar', async ({ page }) => {
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('sign-out clears session and redirects to /login', async ({ page }) => {
    await page.getByRole('button', { name: /open user menu/i }).click();
    await page.getByRole('menuitem', { name: /sign out/i }).click();
    await page.waitForURL('**/login', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('COSAF', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await page.goto('/dashboard/cosaf');
  });

  test('renders the client profiles page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /client profiles/i })).toBeVisible({
      timeout: 10_000,
    });
  });
});
