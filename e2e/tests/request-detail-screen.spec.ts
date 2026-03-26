import { PrismaClient } from '@prisma/client';
import { test, expect, type Page } from '@playwright/test';

const adminEmail = process.env.E2E_TEST_USER_EMAIL || 'admin@newvision.in';
const adminPassword = process.env.E2E_TEST_USER_PASSWORD || 'Password123!@#';
const prisma = new PrismaClient();

async function loginToRequests(page: Page) {
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

async function createDraftRequest(page: Page, suffix: string) {
  const title = `Screen 4 Draft ${suffix}`;
  const description = `Playwright request detail coverage ${suffix}`;

  await loginToRequests(page);

  const requestTypesResponse = await page.request.get('/api/v1/request-types');
  expect(requestTypesResponse.ok()).toBeTruthy();
  const requestTypesPayload = await requestTypesResponse.json() as {
    data?: Array<{ code: string; isActive?: boolean }>;
  };

  const requestTypes = requestTypesPayload.data || [];
  const selectedRequestType = requestTypes.find(
    (requestType) => requestType.code === 'CUSTOMER_ONBOARDING' && requestType.isActive !== false,
  );

  expect(selectedRequestType).toBeTruthy();

  const xsrfToken = (await page.context().cookies())
    .find((cookie) => cookie.name === 'XSRF-TOKEN')
    ?.value;

  expect(xsrfToken).toBeTruthy();

  const createResponse = await page.request.post('/api/v1/requests', {
    headers: {
      'X-XSRF-TOKEN': xsrfToken || '',
    },
    data: {
      typeCode: selectedRequestType?.code,
      title,
      description,
      priority: 'MEDIUM',
      requestData: {
        customerLegalName: `Customer ${suffix}`,
        primaryContactEmail: `screen4-${Date.now()}@example.com`,
        engagementOwner: 'Admin User',
      },
    },
  });

  if (!createResponse.ok()) {
    throw new Error(`Failed to create request draft: ${createResponse.status()} ${await createResponse.text()}`);
  }
  const createPayload = await createResponse.json() as { data?: { id: string } };
  expect(createPayload.data?.id).toBeTruthy();

  await page.goto(`/requests/${createPayload.data?.id}`);

  await expect(page).toHaveURL(/\/requests\/[0-9a-f-]+$/i, { timeout: 15000 });
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  return { id: createPayload.data?.id || '', title, description };
}

test.describe('Request Detail Screen', () => {
  const requestIdsByTitle = new Map<string, string>();

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'logged-out', 'Request detail screen coverage is scoped to the logged-out project.');

    const safeTitle = testInfo.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const draft = await createDraftRequest(page, `${safeTitle}-${Date.now()}`);
    requestIdsByTitle.set(testInfo.title, draft.id);
  });

  test.afterEach(async ({}, testInfo) => {
    const requestId = requestIdsByTitle.get(testInfo.title);
    if (!requestId) {
      return;
    }

    await prisma.request.update({
      where: { id: requestId },
      data: { deletedAt: new Date() },
    }).catch(() => undefined);

    requestIdsByTitle.delete(testInfo.title);
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('REQUEST-DETAIL-SCREEN-001: should render request detail with sane draft data', async ({ page }) => {
    await expect(page.locator('span.text-sm.font-mono')).toBeVisible();
    await expect(page.getByText(/^draft$/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /submit for approval/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^edit$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /more actions/i })).toBeVisible();

    await expect(page.getByRole('button', { name: /^details$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^comments$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^history$/i })).toBeVisible();

    await expect(page.getByRole('heading', { name: /request details/i })).toBeVisible();
  await expect(page.locator('h3').filter({ hasText: 'Request Information' })).toBeVisible();
    await expect(page.getByText(/^type$/i)).toBeVisible();
    await expect(page.getByText(/^requester$/i)).toBeVisible();
    await expect(page.getByText(/^created$/i)).toBeVisible();
    await expect(page.getByText(/^version$/i)).toBeVisible();
    await expect(page.locator('main').getByText(adminEmail)).toBeVisible();
    await expect(page.getByText(/^v1$/i)).toBeVisible();
  });

  test('REQUEST-DETAIL-SCREEN-002: should navigate back to requests from the back button', async ({ page }) => {
    await page.locator('main').getByRole('button').first().click();
    await expect(page).toHaveURL(/\/requests$/);
    await expect(page.getByRole('heading', { name: /^requests$/i })).toBeVisible();
  });

  test('REQUEST-DETAIL-SCREEN-003: should switch between details, comments, and history tabs', async ({ page }) => {
    await page.getByRole('button', { name: /^comments$/i }).click();
    await expect(page.getByRole('heading', { name: /^comments$/i })).toBeVisible();
    await expect(page.getByPlaceholder('Add a comment...')).toBeVisible();

    await page.getByRole('button', { name: /^history$/i }).click();
    await expect(page.getByRole('heading', { name: /activity history/i })).toBeVisible();
    await expect(page.locator('main').getByText(/^created$/i).first()).toBeVisible();

    await page.getByRole('button', { name: /^details$/i }).click();
    await expect(page.getByRole('heading', { name: /request details/i })).toBeVisible();
  });

  test('REQUEST-DETAIL-SCREEN-004: should post a new comment', async ({ page }) => {
    const commentText = `Comment added during screen 4 validation ${Date.now()}`;

    await page.getByRole('button', { name: /^comments$/i }).click();
    await page.getByPlaceholder('Add a comment...').fill(commentText);
    await page.getByRole('button', { name: /post comment/i }).click();

    await expect(page.getByText(commentText)).toBeVisible();
    await expect(page.getByText(/no comments yet/i)).toHaveCount(0);
  });

  test('REQUEST-DETAIL-SCREEN-005: should open and close the edit dialog', async ({ page }) => {
    await page.getByRole('button', { name: /^edit$/i }).click();
    await expect(page.getByRole('heading', { name: /edit request draft/i })).toBeVisible();
    await expect(page.locator('#edit-request-title')).toBeVisible();
    await expect(page.locator('#edit-request-description')).toBeVisible();

    await page.getByRole('button', { name: /^cancel$/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('REQUEST-DETAIL-SCREEN-006: should save edits and reflect updated data', async ({ page }) => {
    const updatedTitle = `Updated Screen 4 Title ${Date.now()}`;
    const updatedDescription = `Updated detail screen description ${Date.now()}`;

    await page.getByRole('button', { name: /^edit$/i }).click();
    await page.locator('#edit-request-title').fill(updatedTitle);
    await page.locator('#edit-request-description').fill(updatedDescription);
    await page.getByRole('button', { name: /save changes/i }).click();

    await expect(page.getByText(/draft updated/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible();
    await expect(page.getByText(updatedDescription)).toBeVisible();
  });

  test('REQUEST-DETAIL-SCREEN-007: should submit the draft for approval', async ({ page }) => {
    await page.getByRole('button', { name: /submit for approval/i }).click();
    await expect(page.getByRole('heading', { name: /submit for approval/i })).toBeVisible();
    await page.getByRole('button', { name: /^submit$/i }).click();

    await expect(page.getByText(/request submitted for approval/i)).toBeVisible();
    await expect(page.locator('main').getByText(/approved|pending approval|in progress/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /submit for approval/i })).toHaveCount(0);
  });

  test('REQUEST-DETAIL-SCREEN-008: should cancel the draft request from more actions', async ({ page }) => {
    await page.getByRole('button', { name: /more actions/i }).click();
    await page.getByRole('button', { name: /cancel request/i }).click();
    await expect(page.getByRole('heading', { name: /cancel request/i })).toBeVisible();

    const reasonField = page.locator('#cancel-request-comments');
    await expect(reasonField).toBeVisible();
    await reasonField.fill(`Cancel draft from screen 4 test ${Date.now()}`);
    await page.getByRole('button', { name: /cancel request/i }).click();

    await expect(page.getByText(/^cancelled$/i)).toBeVisible();
    await expect(page.getByText(/request cancelled/i)).toBeVisible();
  });
});