import { test, expect } from '@playwright/test';

const adminEmail = process.env.E2E_TEST_USER_EMAIL || 'admin@newvision.in';
const adminPassword = process.env.E2E_TEST_USER_PASSWORD || 'Password123!@#';

async function loginToDashboard(page: import('@playwright/test').Page) {
  await page.goto('/');

  if (await page.getByRole('heading', { name: /dashboard/i }).isVisible().catch(() => false)) {
    return;
  }

  await expect(page).toHaveURL(/\/login$/, { timeout: 15000 });
  await page.getByLabel(/email/i).fill(adminEmail);
  await page.getByLabel(/password/i).fill(adminPassword);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
}

function parseNumber(text: string): number {
  const normalized = text.replace(/,/g, '').trim();
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    throw new Error(`Unable to parse number from: ${text}`);
  }
  return Number(match[0]);
}

test.describe('Dashboard Screen', () => {
  test.beforeEach(async ({ page }) => {
    await loginToDashboard(page);
  });

  test('DASHBOARD-SCREEN-001: should render dashboard sections with sane data', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/real-time overview of your resource management/i)).toBeVisible();
    await expect(page.getByText(/utilization trend/i)).toBeVisible();
    await expect(page.getByText(/utilization by practice/i)).toBeVisible();
    await expect(page.getByText(/resource distribution/i)).toBeVisible();
    await expect(page.getByText(/utilization breakdown/i)).toBeVisible();
    await expect(page.getByText(/quick summary/i)).toBeVisible();
    await expect(page.getByText(/capacity forecast/i)).toBeVisible();
    await expect(page.getByText(/immediate actions required/i)).toBeVisible();
    await expect(page.getByText(/quick navigation/i)).toBeVisible();

    const utilizationRate = parseNumber(await page.locator('text=/Utilization Rate/').locator('..').textContent() || '');
    const totalResources = parseNumber(await page.locator('text=/Total Resources/').locator('..').textContent() || '');
    const activeProjects = parseNumber(await page.locator('text=/Active Projects/').locator('..').textContent() || '');
    const activeAllocations = parseNumber(await page.locator('text=/Active Allocations/').nth(0).locator('..').textContent() || '');
    const pendingAllocations = parseNumber(await page.locator('text=/Pending Allocations/').locator('..').textContent() || '');
    const rolloffs = parseNumber(await page.getByText('Roll-offs (30 days)').locator('..').textContent() || '');
    const deployedResources = parseNumber(await page.locator('text=/Deployed Resources/').locator('..').textContent() || '');

    expect(utilizationRate).toBeGreaterThanOrEqual(0);
    expect(utilizationRate).toBeLessThanOrEqual(100);
    expect(totalResources).toBeGreaterThan(0);
    expect(activeProjects).toBeGreaterThanOrEqual(0);
    expect(activeAllocations).toBeGreaterThanOrEqual(0);
    expect(pendingAllocations).toBeGreaterThanOrEqual(0);
    expect(rolloffs).toBeGreaterThanOrEqual(0);
    expect(deployedResources).toBeGreaterThanOrEqual(0);
    expect(deployedResources).toBeLessThanOrEqual(totalResources);

    // Cross-metric sanity: a populated dashboard should not report effectively empty utilization.
    if (activeProjects >= 25 && activeAllocations >= 25 && totalResources >= 100) {
      expect(utilizationRate).toBeGreaterThanOrEqual(10);
    }
  });

  test('DASHBOARD-SCREEN-002: should allow currency selection', async ({ page }) => {
    const currencySelect = page.locator('select').first();
    await expect(currencySelect).toBeVisible();

    const options = await currencySelect.locator('option').allTextContents();
    expect(options.length).toBeGreaterThan(0);

    const currentValue = await currencySelect.inputValue();
    const alternateOption = await currencySelect.locator('option').evaluateAll((nodes, current) => {
      const option = nodes.find((node) => (node as HTMLOptionElement).value !== current) as HTMLOptionElement | undefined;
      return option?.value || null;
    }, currentValue);

    if (alternateOption) {
      await currencySelect.selectOption(alternateOption);
      await expect(currencySelect).toHaveValue(alternateOption);
    } else {
      await expect(currencySelect).toHaveValue(currentValue);
    }
  });

  test('DASHBOARD-SCREEN-003: should refresh without breaking the screen', async ({ page }) => {
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/failed to load dashboard data/i)).toHaveCount(0);
  });

  test('DASHBOARD-SCREEN-004: should navigate to bench resources from quick navigation', async ({ page }) => {
    await page.getByRole('link', { name: /bench resources/i }).click();
    await expect(page).toHaveURL(/\/resources\?status=bench$/);
  });

  test('DASHBOARD-SCREEN-005: should navigate to upcoming roll-offs from quick navigation', async ({ page }) => {
    await page.getByRole('link', { name: /upcoming roll-offs/i }).click();
    await expect(page).toHaveURL(/\/allocations\?rolloff=30$/);
  });

  test('DASHBOARD-SCREEN-006: should navigate to pipeline projects from quick navigation', async ({ page }) => {
    await page.getByRole('link', { name: /pipeline projects/i }).click();
    await expect(page).toHaveURL(/\/projects\?status=pipeline$/);
  });

  test('DASHBOARD-SCREEN-007: should navigate to in notice resources from quick navigation', async ({ page }) => {
    await page.getByRole('link', { name: /in notice/i }).click();
    await expect(page).toHaveURL(/\/resources\?status=notice$/);
  });
});