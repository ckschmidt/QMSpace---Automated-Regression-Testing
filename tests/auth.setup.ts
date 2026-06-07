import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { STORAGE_STATE } from './auth-storage.js';

/**
 * Authentication setup project.
 *
 * Runs once before any browser-project test and persists the resulting
 * cookies + localStorage to STORAGE_STATE so every downstream test starts
 * already signed in, eliminating per-test login latency.
 *
 * Wired to the browser projects via `dependencies: ['setup']` and
 * `use: { storageState: STORAGE_STATE }` in playwright.config.ts.
 */

const TEST_ACCOUNT = process.env['QMS_TEST_ACCOUNT'] ?? 'connor.schmidt@gessnet.com';
const TEST_PASSWORD = process.env['QMS_TEST_PASSWORD'] ?? 'Connor23!';

setup('authenticate', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.signIn(TEST_ACCOUNT, TEST_PASSWORD);

  // Business rule: storage state is only meaningful if the sign-in actually
  // succeeded. Wait for the post-login redirect before persisting.
  await expect(page).not.toHaveURL(/\/signin/);

  await page.context().storageState({ path: STORAGE_STATE });
});
