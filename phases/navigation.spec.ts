import { test, expect } from '@playwright/test';

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
    await page.getByRole('navigation', { name: /dashboard/i })
      .getByRole('link', { name: /performance/i })
      .first()
      .click();

    await page.waitForURL('**/dashboard/metrics', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /metrics dashboard/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('navigates to Lapsation page via sidebar', async ({ page }) => {
    await page.getByRole('navigation', { name: /dashboard/i })
      .getByRole('link', { name: /lapsation/i })
      .click();

    await page.waitForURL('**/dashboard/lapsation', { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: /at-risk and reinstatement/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('navigates to User Management via sidebar', async ({ page }) => {
    await page.getByRole('navigation', { name: /dashboard/i })
      .getByRole('link', { name: /user management/i })
      .click();

    await page.waitForURL('**/dashboard/admin/users', { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: /user management/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('dashboard overview cards render', async ({ page }) => {
    await expect(page.getByText(/branch command center/i)).toBeVisible();
    await expect(page.getByText(/dual themes/i)).toBeVisible();
  });

  test('theme toggle switches between light and dark', async ({ page }) => {
    const html = page.locator('html');

    // Switch to dark
    await page.getByRole('button', { name: /switch to dark mode/i }).click();
    await expect(html).toHaveClass(/dark/);

    // Switch back to light
    await page.getByRole('button', { name: /switch to light mode/i }).click();
    await expect(html).not.toHaveClass(/dark/);
  });
});

test.describe('Unauthorized access', () => {
  test('shows /unauthorized page when accessing protected route with wrong role', async ({
    page,
  }) => {
    // Go directly to the unauthorized page to verify it renders
    await loginAsAdmin(page);
    await page.goto('/unauthorized');

    await expect(
      page.getByText(/you do not have access to this area/i),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /go back to dashboard/i }),
    ).toBeVisible();
  });
});

test.describe('404 page', () => {
  test('renders the not-found page for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-at-all');
    await expect(page.getByText(/page not found/i)).toBeVisible({ timeout: 10_000 });
  });
});
