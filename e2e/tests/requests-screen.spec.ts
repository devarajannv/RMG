import { test, expect } from '@playwright/test';

const adminEmail = process.env.E2E_TEST_USER_EMAIL || 'admin@newvision.in';
const adminPassword = process.env.E2E_TEST_USER_PASSWORD || 'Password123!@#';

async function loginToRequests(page: import('@playwright/test').Page) {
  await page.goto('/requests');

  if (await page.getByRole('heading', { name: /^requests$/i }).isVisible().catch(() => false)) {
    return;
  }

  await expect(page).toHaveURL(/\/login$/, { timeout: 15000 });
  await page.getByLabel(/email/i).fill(adminEmail);
  await page.getByLabel(/password/i).fill(adminPassword);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });

  await page.goto('/requests');
  await expect(page.getByRole('heading', { name: /^requests$/i })).toBeVisible();
}

function parseNumber(text: string): number {
  const normalized = text.replace(/,/g, ' ').trim();
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    throw new Error(`Unable to parse number from: ${text}`);
  }
  return Number(match[0]);
}

async function openCreateRequestModal(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /^new request$/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: /create new request/i })).toBeVisible();
}

test.describe('Requests Screen', () => {
  test.beforeEach(async ({ page }) => {
    await loginToRequests(page);
  });

  test('REQUESTS-SCREEN-001: should render requests dashboard with sane data', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^requests$/i })).toBeVisible();
    await expect(page.getByText(/manage and track all requests/i)).toBeVisible();
    await expect(page.getByText(/^total requests$/i)).toBeVisible();
    await expect(page.getByText(/^drafts$/i)).toBeVisible();
    await expect(page.getByText(/^pending$/i)).toBeVisible();
    await expect(page.getByText(/^approved$/i)).toBeVisible();
    await expect(page.getByRole('main').getByText(/^my approvals$/i)).toBeVisible();

    const totalRequests = parseNumber(await page.getByText(/^total requests$/i).locator('..').textContent() || '');
    const drafts = parseNumber(await page.getByText(/^drafts$/i).locator('..').textContent() || '');
    const pending = parseNumber(await page.getByText(/^pending$/i).locator('..').textContent() || '');
    const approved = parseNumber(await page.getByText(/^approved$/i).locator('..').textContent() || '');
    const myApprovals = parseNumber(await page.getByRole('main').getByText(/^my approvals$/i).locator('..').textContent() || '');

    expect(totalRequests).toBeGreaterThanOrEqual(0);
    expect(drafts).toBeGreaterThanOrEqual(0);
    expect(pending).toBeGreaterThanOrEqual(0);
    expect(approved).toBeGreaterThanOrEqual(0);
    expect(myApprovals).toBeGreaterThanOrEqual(0);
    expect(totalRequests).toBeGreaterThanOrEqual(drafts + pending + approved);

    const emptyState = page.getByText(/no requests found/i);
    if (await emptyState.isVisible().catch(() => false)) {
      await expect(emptyState).toBeVisible();
    } else {
      await expect(page.locator('div.cursor-pointer').first()).toBeVisible();
    }
  });

  test('REQUESTS-SCREEN-002: should allow tab switching', async ({ page }) => {
    const allRequestsTab = page.getByRole('button', { name: /^all requests$/i });
    const myRequestsTab = page.getByRole('button', { name: /^my requests$/i });
    const pendingApprovalTab = page.getByRole('button', { name: /pending my approval/i });

    await myRequestsTab.click();
    await expect(myRequestsTab).toHaveClass(/bg-white/);

    await pendingApprovalTab.click();
    await expect(pendingApprovalTab).toHaveClass(/bg-white/);

    await allRequestsTab.click();
    await expect(allRequestsTab).toHaveClass(/bg-white/);
  });

  test('REQUESTS-SCREEN-003: should accept search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search requests...');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('allocation');
    await expect(searchInput).toHaveValue('allocation');

    await searchInput.clear();
    await expect(searchInput).toHaveValue('');
  });

  test('REQUESTS-SCREEN-004: should toggle status filters', async ({ page }) => {
    const statusButton = page.getByRole('button', { name: /status/i });
    await statusButton.click();

    const approvedStatus = page.getByRole('button', { name: /^approved$/i });
    await approvedStatus.click();
    await expect(statusButton).toContainText('1');

    await statusButton.click();
    await page.getByRole('button', { name: /clear filters/i }).click();
    await expect(statusButton).toContainText('Status');
    await expect(statusButton).not.toContainText('1');
  });

  test('REQUESTS-SCREEN-005: should toggle type filters', async ({ page }) => {
    const typeButton = page.getByRole('button', { name: /type/i });
    await typeButton.click();

    const customerOnboardingType = page.getByRole('button', { name: /^customer onboarding$/i });
    await expect(customerOnboardingType).toBeVisible();
    await customerOnboardingType.click();
    await expect(typeButton).toContainText('1');

    await typeButton.click();
    await page.getByRole('button', { name: /clear filters/i }).click();
    await expect(typeButton).toContainText('Type');
    await expect(typeButton).not.toContainText('1');
  });

  test('REQUESTS-SCREEN-006: should open the create request modal', async ({ page }) => {
    await openCreateRequestModal(page);
    await expect(page.getByText(/select the type of request you want to create/i)).toBeVisible();

    const noTypesMessage = page.getByText(/no active request types are available/i);
    if (await noTypesMessage.isVisible().catch(() => false)) {
      await expect(noTypesMessage).toBeVisible();
    } else {
      await expect(page.getByRole('dialog').locator('button').filter({ hasText: /.+/ }).first()).toBeVisible();
    }
  });

  test('REQUESTS-SCREEN-007: should open a request type form and expose form actions', async ({ page }) => {
    await openCreateRequestModal(page);

    const typeButtons = page.getByRole('dialog').locator('button').filter({ has: page.locator('p.font-medium') });
    const typeCount = await typeButtons.count();
    expect(typeCount).toBeGreaterThan(0);

    await typeButtons.first().click();
    await expect(page.getByRole('heading', { name: /^new /i })).toBeVisible();
    await expect(page.locator('#request-title')).toBeVisible();
    await expect(page.getByRole('button', { name: /^cancel$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /save draft/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /submit for approval/i })).toBeVisible();
  });

  test('REQUESTS-SCREEN-008: should close the create request form with cancel', async ({ page }) => {
    await openCreateRequestModal(page);

    const typeButtons = page.getByRole('dialog').locator('button').filter({ has: page.locator('p.font-medium') });
    const typeCount = await typeButtons.count();
    expect(typeCount).toBeGreaterThan(0);

    await typeButtons.first().click();
    await page.getByRole('button', { name: /^cancel$/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});