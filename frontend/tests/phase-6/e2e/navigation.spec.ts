import { expect, test } from '@playwright/test';

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('admin@a1prime.com');
  await page.getByLabel('Password').fill('Admin123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
}

test.describe('Dashboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('navigates to Metrics page via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: /metrics|performance/i }).first().click();
    await page.waitForURL(/\/dashboard\/(metrics|performance)/, { timeout: 10_000 });
  });

  test('navigates to Lapsation page via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: /lapsation/i }).click();
    await page.waitForURL('**/dashboard/lapsation', { timeout: 10_000 });
  });

  test('theme toggle switches appearance', async ({ page }) => {
    const html = page.locator('html');
    const toggle = page.getByRole('button', { name: /switch to dark mode|switch to light mode/i });
    await toggle.click();
    await expect(html).toHaveAttribute('class', /dark|light/);
  });
});

test.describe('Unauthorized access', () => {
  test('shows /unauthorized page', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/unauthorized');
    await expect(page.getByText(/unauthorized|do not have access/i)).toBeVisible();
  });
});

test.describe('404 page', () => {
  test('renders the not-found page for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-at-all');
    await expect(page.getByText(/page not found/i)).toBeVisible({ timeout: 10_000 });
  });
});
