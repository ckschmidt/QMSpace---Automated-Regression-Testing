// import { test, expect } from '@playwright/test';

// test('has title', async ({ page }) => {
//   await page.goto('https://playwright.dev/');

//   // Expect a title "to contain" a substring.
//   await expect(page).toHaveTitle(/Playwright/);
// });

// test('get started link', async ({ page }) => {
//   await page.goto('https://playwright.dev/');

//   // Click the get started link.
//   await page.getByRole('link', { name: 'Get started' }).click();

//   // Expects page to have a heading with the name of Installation.
//   await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
// });

// test('test', async ({ page }) => {
//   await page.goto('https://auto.qmsgpt.net/signin');
//   await page.getByRole('button', { name: 'Deliverable Flow' }).click();
//   await page.getByRole('button', { name: 'Live Data' }).click();
//   await page.getByRole('button', { name: 'Lifecycle' }).click();
//   await page.getByRole('button', { name: 'Feeds' }).click();
//   await page.getByRole('button', { name: 'Activities' }).click();
//   await page.getByRole('button', { name: 'Dashboard' }).click();
//   await page.getByRole('button', { name: 'Settings' }).click();
//   await page.getByRole('button', { name: 'Deliverables' }).click();
//   await page.getByLabel('Intended Use(s) Statement').click();
// });

// Refactored Page Object Models / tests now live at:
//   - pages/LoginPage.ts            tests/login.spec.ts
//   - pages/ProductsPage.ts         tests/intended-product.spec.ts
//     (covers basic create, batch create, and create-then-delete flows;
//      delete is row-level on the Products listing)
//   - pages/IntendedProductForm.ts

