import { defineConfig, devices } from '@playwright/test';
import { STORAGE_STATE } from './tests/auth-storage.js';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Specs routed to the per-browser `-products` projects rather than the main
 * browser project. The match-on-one-side / ignore-on-the-other split needs a
 * single source of truth, otherwise the two regexes can silently drift apart
 * and a spec would either run in both phases or neither.
 */
const PRODUCT_CREATION_SPEC = /intended-product\.spec\.ts/;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  ...(process.env.CI ? { workers: 1 } : {}),
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    /* One-shot project that signs in and writes storageState to disk.
     * Browser projects below depend on it and load that storageState so each
     * test starts already authenticated. */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    /* For each browser, a two-phase split:
     *
     *   `${browser}-products` — runs intended-product.spec.ts only. Creates
     *                           the baseline products and persists their
     *                           exact names to
     *                           playwright/.auth/products-${browser}.json
     *                           via tests/created-products.ts.
     *
     *   `${browser}`          — runs every OTHER spec (login, productnav,
     *                           future workflows). Depends on the matching
     *                           `${browser}-products` project so the
     *                           baseline products are guaranteed to exist
     *                           and be addressable by name before any of
     *                           these tests run.
     *
     * The dependency chain is therefore: setup → ${browser}-products →
     * ${browser}.
     */
    {
      name: 'chromium-products',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      testMatch: PRODUCT_CREATION_SPEC,
      dependencies: ['setup'],
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      testIgnore: PRODUCT_CREATION_SPEC,
      dependencies: ['chromium-products'],
    },

    {
      name: 'firefox-products',
      use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE },
      testMatch: PRODUCT_CREATION_SPEC,
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE },
      testIgnore: PRODUCT_CREATION_SPEC,
      dependencies: ['firefox-products'],
    },

    {
      name: 'webkit-products',
      use: { ...devices['Desktop Safari'], storageState: STORAGE_STATE },
      testMatch: PRODUCT_CREATION_SPEC,
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: STORAGE_STATE },
      testIgnore: PRODUCT_CREATION_SPEC,
      dependencies: ['webkit-products'],
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
