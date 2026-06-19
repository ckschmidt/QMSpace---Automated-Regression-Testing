import { test } from '@playwright/test';
import { ProductsPage } from '../pages/ProductsPage.js';
import { ProductNavigationMenu } from '../pages/ProductNavigationMenu.js';
import { ProductDeliverablesPage } from '../pages/ProductDeliverablesPage.js';
import { DeliverableFilterDialog } from '../pages/DeliverableFilterDialog.js';
import { DeliverableWorksheetPage } from '../pages/DeliverableWorksheetPage.js';
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
 * and opens one of its deliverables for the first time, which is the
 * exact condition that triggers the filter dialog this spec covers.
 */

test.use({
  viewport: { width: 1920, height: 1080 },
});

/**
 * Deliverable the test exercises. User Needs is a Design Controls
 * deliverable, which the batch product (created by
 * intended-product.spec.ts) always provisions, so it's stable to target.
 *
 * Distinct from the deliverable used by deliverable-worksheet.spec.ts so
 * the two specs don't share their "first open" trigger and can run in
 * parallel on the same product without one consuming the other's
 * filter-dialog opportunity.
 */
const DELIVERABLE = 'User Needs';

test.describe('Deliverable filter dialog', () => {
  test('user skips the filter dialog and the worksheet loads unfiltered', async ({
    page,
  }, testInfo) => {
    // Product open + nav + deliverable open + dialog skip + worksheet
    // mount. Webkit pushes past the 30 s default once the cumulative work
    // lands.
    test.setTimeout(120_000);

    const batchProductName = getCreatedProduct(testInfo, 'batch');

    const productsPage = new ProductsPage(page);
    await productsPage.goto();
    await productsPage.openProduct(batchProductName);

    const nav = new ProductNavigationMenu(page);
    await nav.expectLoaded();
    await nav.goTo('Deliverables');

    const deliverables = new ProductDeliverablesPage(page);
    await deliverables.open(DELIVERABLE);

    // Business rule: the very first time a deliverable is opened the
    // app surfaces a filter dialog that gates access to the worksheet.
    // The dismissal is recorded server-side per user+deliverable, so
    // after the first run for a given user the dialog never mounts
    // again — [[dismissIfPresent]] tolerates either path and clicks
    // Skip if the dialog appears. The post-dismiss worksheet load is
    // the assertion that always holds and is what this spec ultimately
    // verifies.
    const filter = new DeliverableFilterDialog(page);
    await filter.dismissIfPresent();

    // Business rule: with the filter step out of the way the
    // deliverable's unfiltered worksheet renders. The grid's add-row
    // placeholder is the canonical "worksheet mounted" signal — if
    // it's visible the dialog dismissed cleanly (or never mounted) and
    // the underlying page took over.
    const worksheet = new DeliverableWorksheetPage(page);
    await worksheet.expectLoaded();
  });
});
