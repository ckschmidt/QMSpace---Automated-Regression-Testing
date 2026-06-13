import { test } from '@playwright/test';
import { ProductsPage } from '../pages/ProductsPage.js';
import {
  ProductNavigationMenu,
  type ProductNavigationTab,
} from '../pages/ProductNavigationMenu.js';
import { ProductDeliverablesPage } from '../pages/ProductDeliverablesPage.js';

/**
 * Auth is provided by the `setup` project (tests/auth.setup.ts) via the
 * `storageState` loaded for the chromium/firefox/webkit projects in
 * playwright.config.ts — no per-test sign-in is needed here.
 *
 * This spec assumes the "with batch" Intended Product for the current browser
 * project has already been created by `tests/intended-product.spec.ts`
 * (the `user creates an Intended Product with batch task creation enabled`
 * case). It opens that product by searching the Products listing for the
 * project-name-prefixed batch product, then walks its navigation tabs.
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

    const productsPage = new ProductsPage(page);
    await productsPage.goto();

    // The batch product is created with name
    // `${projectName} Test Product w/ Batch ${Date.now()}` — opening by this
    // prefix selects the matching product for the current browser project
    // without needing the exact timestamp suffix. If multiple historical
    // batch products exist for this project, the first matching row wins;
    // the test does not care which one, only that the nav menu loads.
    await productsPage.openProductByPrefix(
      `${testInfo.project.name} Test Product w/ Batch`,
    );

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
