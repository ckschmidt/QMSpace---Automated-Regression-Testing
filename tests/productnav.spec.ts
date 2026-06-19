import { test } from '@playwright/test';
import { ProductsPage } from '../pages/ProductsPage.js';
import {
  ProductNavigationMenu,
  type ProductNavigationTab,
} from '../pages/ProductNavigationMenu.js';
import { ProductDeliverablesPage } from '../pages/ProductDeliverablesPage.js';
import { getCreatedProduct } from './created-products.js';

/**
 * Auth is provided by the `setup` project (tests/auth.setup.ts) via the
 * `storageState` loaded for the chromium/firefox/webkit projects in
 * playwright.config.ts — no per-test sign-in is needed here.
 *
 * Project ordering in playwright.config.ts enforces that this spec runs
 * after the matching `${browser}-products` project (which runs
 * tests/intended-product.spec.ts and persists the created products to
 * playwright/.auth/). This test reads back the batch product's exact name
 * and opens it, so the nav-walk always exercises the freshly-created
 * artifact (not a stale historical row matching the same prefix).
 */

test.use({
  viewport: { width: 1920, height: 1080 },
});

// The full sequence of navigation tabs walked by the smoke test. Kept as a
// module-level constant so adding or reordering tabs does not require
// touching the test body.
const NAV_SEQUENCE: readonly ProductNavigationTab[] = [
  'Deliverable Flow',
  'Live Data',
  'Lifecycle',
  'Feeds',
  'Activities',
  'Dashboard',
  'Settings',
  'Deliverables',
];

test.describe('Product navigation', () => {
  test('user walks every product navigation tab and opens a deliverable', async ({
    page,
  }, testInfo) => {
    // Open-by-search + tab walk + deliverable open — the cumulative time on
    // Webkit can push past the 30 s default, so match the batch-creation
    // spec's headroom.
    test.setTimeout(90_000);

    const batchProductName = getCreatedProduct(testInfo, 'batch');

    const productsPage = new ProductsPage(page);
    await productsPage.goto();
    await productsPage.openProduct(batchProductName);

    const nav = new ProductNavigationMenu(page);
    await nav.expectLoaded();

    for (const tab of NAV_SEQUENCE) {
      await nav.goTo(tab);
    }

    // Landing on Deliverables exposes the deliverable cards by accessible
    // label; opening the "Intended Use(s) Statement" card is the smoke
    // check that the Deliverables panel finished rendering.
    const deliverables = new ProductDeliverablesPage(page);
    await deliverables.open('Intended Use(s) Statement');
  });
});
