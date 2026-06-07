import { test, expect } from '@playwright/test';
import { ProductsPage } from '../pages/ProductsPage.js';
import type { IntendedProductInput } from '../pages/IntendedProductForm.js';

/**
 * Auth is provided by the `setup` project (tests/auth.setup.ts) via the
 * `storageState` loaded for the chromium/firefox/webkit projects in
 * playwright.config.ts — no per-test sign-in is needed here.
 */

test.use({
  viewport: { width: 1920, height: 1080 },
});

/**
 * Builds a product payload with a freshly generated unique name. QMSpace
 * enforces global uniqueness on Intended Product names, so a hardcoded value
 * would fail on the second run. A millisecond timestamp is both unique per
 * run and human-sortable when scanning the products list later.
 */
function buildProduct(): IntendedProductInput {
  return {
    parentFolder: 'Automated Regression Test',
    name: `Test Product w/o Bastch ${Date.now()}`,
    description: 'Test Description',
    category: 'Device Technologies *',
    template: 'PFS or Auto Injector (none software) - V3.0',
    lifeCycle: 'General Product Life Cycle',
  };
}

test.describe('Intended Product creation', () => {
  test('user creates an Intended Product with required fields', async ({ page }) => {
    // Webkit renders the MUI dialog noticeably slower than the other engines;
    // the chained dropdown selections push the cumulative time past the 30 s
    // default before the form's later fields are polled into existence.
    test.setTimeout(90_000);

    const productsPage = new ProductsPage(page);

    await productsPage.goto();
    const form = await productsPage.openIntendedProductForm();

    const product = buildProduct();
    await form.createProduct(product);

    // Business rule: a successful Create dismisses the modal — the Create
    // button must no longer be present in the DOM. If it remains visible the
    // form is still open, which means validation failed or the API request
    // did not succeed.
    await expect(form.createButton).toBeHidden();
  });
});
