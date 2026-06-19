import { test, expect } from '@playwright/test';
import { ProductsPage } from '../pages/ProductsPage.js';
import type { IntendedProductInput } from '../pages/IntendedProductForm.js';
import { browserKey, recordCreatedProduct } from './created-products.js';

/**
 * Auth is provided by the `setup` project (tests/auth.setup.ts) via the
 * `storageState` loaded for the chromium/firefox/webkit projects in
 * playwright.config.ts — no per-test sign-in is needed here.
 *
 * This spec runs under the per-browser `${browser}-products` projects
 * (playwright.config.ts), which the matching `${browser}` projects depend
 * on. In addition to verifying the create/delete flows, the create tests
 * record their products' exact names into playwright/.auth/ via
 * [[recordCreatedProduct]] so downstream specs can address them without
 * guessing the `Date.now()` suffix.
 */

test.use({
  viewport: { width: 1920, height: 1080 },
});

/**
 * Builds a product payload with a freshly generated unique name. QMSpace
 * enforces global uniqueness on both the Intended Product **name** and the
 * auto-derived product **code**. The server builds the code from the first
 * letter of each word in the name plus the first three digits of the
 * timestamp, so two browsers running in parallel with names starting
 * `Test Product w/...` both get `TP...` codes and collide on the 403
 * "duplicate code" check. Prefixing the name with the browser identifier
 * (chromium/firefox/webkit) makes the leading letter differ, which makes
 * the auto-code differ too.
 */
function buildProduct(browser: string): IntendedProductInput {
  return {
    parentFolder: 'Automated Regression Test',
    name: `${browser} Test Product w/o Batch ${Date.now()}`,
    description: 'Test Description',
    category: 'Device Technologies *',
    template: 'PFS or Auto Injector (none software) - V3.0',
    lifeCycle: 'General Product Life Cycle',
  };
}

/**
 * Builds a product payload that exercises the batch task-creation workflow:
 * enables the batch radio, then walks Design Controls + Risk Management with
 * Select All, plus Index File Management with its single deliverable.
 *
 * Browser prefix exists for the same reason as `buildProduct` — avoid the
 * parallel-browser auto-code collision on `/api/saas/product`.
 */
function buildBatchProduct(browser: string): IntendedProductInput {
  return {
    parentFolder: 'Automated Regression Test',
    name: `${browser} Test Product w/ Batch ${Date.now()}`,
    category: 'Device Technologies *',
    template: 'PFS or Auto Injector (none software) - V3.0',
    lifeCycle: 'General Product Life Cycle',
    enableBatch: true,
    modules: [
      { name: 'Design Controls', strategy: 'all' },
      { name: 'Risk Management', strategy: 'all' },
      // IFM only contains the single "DHF Index" deliverable. We use the
      // Select All button rather than `.check()` on the lone checkbox
      // because MUI's PrivateSwitchBase input is unreliable on Chromium —
      // the hidden input swallows the click without firing React's
      // onChange. Select All is a plain <button>, so it always lands.
      { name: 'Index File Management', strategy: 'all' },
    ],
  };
}

test.describe('Intended Product creation', () => {
  // Tests in this spec all create a product with auto-derived codes built
  // from name + timestamp. Within one browser project, parallel test
  // execution causes those codes to collide on `POST /api/saas/product`
  // with a 403 "duplicate code". Running them serially within a project
  // keeps each create's GenerateProductCode call separated by an actual
  // commit, so the next test gets a fresh suffix. Cross-project parallelism
  // is preserved (the project-name prefix on each product name handles it).
  test.describe.configure({ mode: 'serial' });

  test('user creates an Intended Product without batch task creation', async ({
    page,
  }, testInfo) => {
    // Webkit renders the MUI dialog noticeably slower than the other engines;
    // the chained dropdown selections push the cumulative time past the 30 s
    // default before the form's later fields are polled into existence.
    test.setTimeout(90_000);

    const productsPage = new ProductsPage(page);

    await productsPage.goto();
    const form = await productsPage.openIntendedProductForm();

    const product = buildProduct(browserKey(testInfo.project.name));
    await form.createProduct(product);

    // Business rule: a successful Create dismisses the modal — the Create
    // button must no longer be present in the DOM. If it remains visible the
    // form is still open, which means validation failed or the API request
    // did not succeed. Allow extra time: batch flows kick off heavy task
    // creation server-side, and even the basic flow can take a beat on a
    // slow connection.
    await expect(form.createButton).toBeHidden({ timeout: 60_000 });

    // A successful Create auto-navigates the app to the new product's detail
    // page. Return to the Products listing and search for the new product to
    // verify it was persisted (the unfiltered table virtualises/scrolls
    // older entries off-DOM as it grows, so the newest row may not appear
    // among the top-level rows without filtering).
    await productsPage.goto();
    await productsPage.searchProducts(product.name);
    await expect(productsPage.productRow(product.name)).toBeVisible();

    // Persist the exact name so downstream specs can open this specific
    // product (not just any historical product with the same prefix).
    recordCreatedProduct(testInfo, 'simple', product.name);
  });

  test('user creates an Intended Product with batch task creation enabled', async ({
    page,
  }, testInfo) => {
    // The batch flow performs three additional Select-All/Apply rounds plus
    // two module switches, so it needs a larger budget than the basic flow.
    test.setTimeout(120_000);

    const productsPage = new ProductsPage(page);

    await productsPage.goto();
    const form = await productsPage.openIntendedProductForm();

    const product = buildBatchProduct(browserKey(testInfo.project.name));
    await form.createProduct(product);

    // Same business rules as the basic creation flow: modal must dismiss and
    // the new product must show up in the persisted Intended Products table
    // after a round-trip back to /products. The batch dismiss timeout is
    // larger because the server creates many tasks across the three modules.
    await expect(form.createButton).toBeHidden({ timeout: 60_000 });

    await productsPage.goto();
    await productsPage.searchProducts(product.name);
    await expect(productsPage.productRow(product.name)).toBeVisible();

    // Persist the exact name so downstream specs (e.g. productnav) can open
    // this specific product instead of guessing the Date.now() suffix.
    recordCreatedProduct(testInfo, 'batch', product.name);
  });

  test('user can delete an Intended Product they just created', async ({
    page,
  }, testInfo) => {
    // Create flow + detail-page delete + table refresh + search.
    test.setTimeout(120_000);

    const productsPage = new ProductsPage(page);

    // ── 1. Create ────────────────────────────────────────────────────────
    await productsPage.goto();
    const form = await productsPage.openIntendedProductForm();
    const product = buildProduct(browserKey(testInfo.project.name));
    await form.createProduct(product);

    // Modal dismisses → app auto-navigates to the new product's detail page.
    await expect(form.createButton).toBeHidden({ timeout: 60_000 });

    // ── 2. Delete ────────────────────────────────────────────────────────
    // Delete is reached from the Products listing (not the detail page),
    // so navigate back first. `deleteProduct` filters by name, clicks the
    // row's Delete action, and confirms the dialog.
    await productsPage.goto();
    await productsPage.deleteProduct(product.name);

    // ── 3. Verify the product is gone from the persisted listing ────────
    // Business rule: a successful delete must remove the product from the
    // Intended Products table — not merely close a confirm dialog. After
    // the deletion settles, searching for the product's name should yield
    // no matching row.
    await productsPage.searchProducts(product.name);
    await expect(productsPage.productRow(product.name)).toBeHidden();
  });
});
