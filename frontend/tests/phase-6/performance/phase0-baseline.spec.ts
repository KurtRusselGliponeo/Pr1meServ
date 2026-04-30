import { expect, test } from '@playwright/test';

const LOGIN_EMAIL = process.env.PHASE0_LOGIN_EMAIL ?? 'admin@a1prime.com';
const LOGIN_PASSWORD = process.env.PHASE0_LOGIN_PASSWORD ?? 'Admin123!';

type Measurement = {
  name: string;
  durationMs: number;
  details?: string;
};

function pushMeasurement(
  measurements: Measurement[],
  name: string,
  startedAt: number,
  details?: string,
) {
  measurements.push({
    name,
    durationMs: Date.now() - startedAt,
    details,
  });
}

test.describe('Phase 0 baseline timings', () => {
  test('captures login, dashboard, and page-switch timings', async ({ page }) => {
    const measurements: Measurement[] = [];
    const apiCalls = new Map<string, number>();

    page.on('response', (response) => {
      const url = response.url();

      if (!url.includes('/api/v1/')) {
        return;
      }

      const key = `${response.request().method()} ${new URL(url).pathname}`;
      apiCalls.set(key, (apiCalls.get(key) ?? 0) + 1);
    });

    const loginVisibleStartedAt = Date.now();
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('Email address')).toBeVisible({ timeout: 30_000 });
    pushMeasurement(measurements, 'login-page-visible', loginVisibleStartedAt);

    const loginSubmitStartedAt = Date.now();
    await page.getByLabel('Email address').fill(LOGIN_EMAIL);
    await page.getByLabel('Password').fill(LOGIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard', { timeout: 30_000 });
    await expect(page.getByText('System governance and global search')).toBeVisible({
      timeout: 30_000,
    });
    pushMeasurement(
      measurements,
      'dashboard-shell-usable',
      loginSubmitStartedAt,
      'Measured against Admin dashboard hero content becoming visible.',
    );

    const navigationChecks = [
      {
        name: 'switch-dashboard-to-performance',
        href: '/dashboard/performance',
        expectedUrl: /\/dashboard\/performance$/,
        heading: 'Unified agent performance dashboard',
      },
      {
        name: 'switch-performance-to-lapsation',
        href: '/dashboard/lapsation',
        expectedUrl: /\/dashboard\/lapsation$/,
        heading: 'Lapsation',
      },
      {
        name: 'switch-lapsation-to-documents',
        href: '/dashboard/documents',
        expectedUrl: /\/dashboard\/documents$/,
        heading: 'Document',
      },
    ] as const;

    for (const navigationCheck of navigationChecks) {
      const startedAt = Date.now();
      await page.goto(navigationCheck.href, { waitUntil: 'domcontentloaded' });
      await page.waitForURL(navigationCheck.expectedUrl, { timeout: 30_000 });
      await expect(page.getByText(navigationCheck.heading, { exact: false })).toBeVisible({
        timeout: 30_000,
      });
      pushMeasurement(measurements, navigationCheck.name, startedAt);
    }

    console.log('PHASE0_MEASUREMENTS_START');
    for (const measurement of measurements) {
      console.log(
        `${measurement.name}: ${measurement.durationMs}ms${measurement.details ? ` (${measurement.details})` : ''}`,
      );
    }

    console.log('PHASE0_API_CALL_COUNTS_START');
    for (const [apiCall, count] of [...apiCalls.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      console.log(`${apiCall}: ${count}`);
    }
  });
});
