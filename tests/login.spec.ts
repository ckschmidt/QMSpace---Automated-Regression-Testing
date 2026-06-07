import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';

/**
 * Credentials default to the values from the original recorded test so the
 * suite remains runnable as-is, but can be overridden per environment via
 * QMS_TEST_ACCOUNT / QMS_TEST_PASSWORD without code changes.
 */
const TEST_ACCOUNT = process.env['QMS_TEST_ACCOUNT'] ?? 'connor.schmidt@gessnet.com';
const TEST_PASSWORD = process.env['QMS_TEST_PASSWORD'] ?? 'Connor23!';

test.use({
  viewport: { width: 1920, height: 1080 },
  // The sign-in test must start unauthenticated, so it opts out of the
  // storageState the `setup` project saved for other specs.
  storageState: { cookies: [], origins: [] },
});

test.describe('Sign-in', () => {
  test('user signs in with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.expectLoaded();

    await loginPage.signIn(TEST_ACCOUNT, TEST_PASSWORD);

    // Business rule: a successful sign-in must navigate the user away from
    // /signin into the authenticated area of the application.
    await expect(page).not.toHaveURL(/\/signin/);
  });
});
