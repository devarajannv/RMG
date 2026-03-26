import { test, expect } from '@playwright/test';

const adminEmail = process.env.E2E_TEST_USER_EMAIL || 'admin@newvision.in';
const adminPassword = process.env.E2E_TEST_USER_PASSWORD || 'Password123!@#';

test.describe('Login Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('LOGIN-SCREEN-001: should render the expected controls and copy', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByText(/sign in to your rmgaas account/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByText(/or continue with/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /microsoft 365/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /forgot password\?/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /request access/i })).toBeVisible();
    await expect(page.getByText(/resource management/i)).toBeVisible();
    await expect(page.getByText(/reimagined\./i)).toBeVisible();
  });

  test('LOGIN-SCREEN-002: should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('#password');
    await passwordInput.fill('Secret123!');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = page.locator('input#password + button');
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('LOGIN-SCREEN-003: should allow toggling Remember me', async ({ page }) => {
    const rememberCheckbox = page.getByRole('checkbox');
    await expect(rememberCheckbox).not.toBeChecked();
    await rememberCheckbox.check();
    await expect(rememberCheckbox).toBeChecked();
    await rememberCheckbox.uncheck();
    await expect(rememberCheckbox).not.toBeChecked();
  });

  test('LOGIN-SCREEN-004: should keep Google SSO disabled and labeled as coming soon', async ({ page }) => {
    const googleButton = page.getByRole('button', { name: /google/i });
    await expect(googleButton).toBeDisabled();
    await expect(googleButton).toHaveAttribute('title', /coming soon/i);
  });

  test('LOGIN-SCREEN-005: should submit valid credentials successfully', async ({ page }) => {
    await page.getByLabel(/email/i).fill(adminEmail);
    await page.getByLabel(/password/i).fill(adminPassword);
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
    await expect(page.locator('main')).toBeVisible();
  });

  test('LOGIN-SCREEN-006: should show an error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('nobody@example.com');
    await page.getByLabel(/password/i).fill('wrong-password');
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page.getByText(/request could not be completed|invalid|incorrect|error/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('LOGIN-SCREEN-007: should navigate when Forgot password is clicked', async ({ page }) => {
    await page.getByRole('link', { name: /forgot password\?/i }).click();
    await expect(page).toHaveURL(/\/forgot-password$/, { timeout: 5000 });
  });

  test('LOGIN-SCREEN-008: should navigate when Request Access is clicked', async ({ page }) => {
    await page.getByRole('link', { name: /request access/i }).click();
    await expect(page).toHaveURL(/\/register$/, { timeout: 5000 });
  });

  test('LOGIN-SCREEN-009: should start Microsoft 365 login flow', async ({ page }) => {
    await page.getByRole('button', { name: /microsoft 365/i }).click();
    await expect(page).toHaveURL(/auth\/microsoft|login\.microsoftonline\.com/, { timeout: 15000 });
  });
});