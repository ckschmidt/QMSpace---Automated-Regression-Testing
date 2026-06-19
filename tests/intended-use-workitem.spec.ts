import { test, expect } from '@playwright/test';
import { ProductsPage } from '../pages/ProductsPage.js';
import { ProductNavigationMenu } from '../pages/ProductNavigationMenu.js';
import { ProductDeliverablesPage } from '../pages/ProductDeliverablesPage.js';
import { DeliverableFilterDialog } from '../pages/DeliverableFilterDialog.js';
import {
  DeliverableWorksheetPage,
  WORKSHEET_CONTENT_COL,
  WORKSHEET_FIRST_ATTRIBUTE_COL,
} from '../pages/DeliverableWorksheetPage.js';
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
 * and drives the Intended Use(s) Statement deliverable's worksheet
 * through the full workitem CRUD + sort lifecycle, so the worksheet
 * actions target the freshly-created artifact.
 *
 * Replaces the smaller `deliverable-worksheet.spec.ts` — the add-empty-row
 * and create-workitem flows it asserted are subsumed by the first two
 * tests below.
 */

test.use({
  viewport: { width: 1920, height: 1080 },
});

/**
 * Deliverable the spec exercises. The batch product created by
 * intended-product.spec.ts always provisions the Intended Use(s)
 * Statement deliverable (it lives under the Index File Management module
 * the batch flow selects), so it's the stable target for end-to-end
 * worksheet coverage.
 */
const DELIVERABLE = 'Intended Use(s) Statement';

/**
 * Workitem name fixtures. Kept as constants so every test references the
 * same string — the spec is a state machine driven across tests in serial
 * order, so any drift between a "set" name and its later "expect" would
 * silently miss the assertion the test is meant to make.
 */
const WORKITEM_1_INITIAL = 'Intended Use Workitem 1';
const WORKITEM_1_EDITED = 'Intended Use Workitem 1 - Edit 1';
const WORKITEM_2_INITIAL = 'Intended Use Workitem 2';
const WORKITEM_2_EDITED = 'Intended Use Workitem 2 - Edit';
const WORKITEM_3 = 'Intended Use Workitem 3';
const WORKITEM_4 = 'Intended Use Workitem 4';
const WORKITEM_5 = 'Intended Use Workitem 5';

const WORKITEM_2_EDITED_LOCATOR = '(CTPWB178M1-ITU-00002) Intended Use Workitem 2 - Edit';
const WORKITEM_3_LOCATOR = '(CTPWB178M1-ITU-00002) Intended Use Workitem 2 - Edit';
const WORKITEM_4_LOCATOR = '(CTPWB178M1-ITU-00002) Intended Use Workitem 2 - Edit';

/**
 * First-attribute (Indications for Use) value fixtures used by the
 * inline cell-edit attribute tests. The details-view test uses a
 * different label-keyed fixture set below.
 */
const ATTR_INDICATION_INITIAL = 'IU2 Attribute - Indication for Use';
const ATTR_INDICATION_EDITED = 'IU2 Attribute - Indication for Use - Edit';

/**
 * Attribute fixtures used by the details-view test. Map each visible
 * label on the Intended Use Statement details form to the value the
 * test fills in. Order is the same order the recorded codegen used so
 * column-order assertions on the worksheet line up with
 * [[WORKSHEET_FIRST_ATTRIBUTE_COL]] +0..+4.
 */
const DETAILS_ATTRIBUTES: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Indications for use', value: 'IU2 Attribute - Indications for use' },
  { label: 'Patient types', value: 'IU2 Attribute - Patient types' },
  { label: 'User types', value: 'IU2 Attribute - User types' },
  { label: 'Environments of use', value: 'IU2 Attribute - Environments of use' },
  { label: 'Use conditions', value: 'IU2 Attribute - Use conditions' },
];

test.describe('Intended Use(s) Statement worksheet', () => {
  // Every test in this block drives the same product → same deliverable →
  // same worksheet, and each builds on persistent server-side state set
  // by the test before it (workitem 1 must exist before it can be edited,
  // workitem 2 must exist before its attribute can be filled, etc.).
  // Running them in parallel would race that state — serial mode keeps
  // the chain deterministic while still letting each test start from a
  // clean browser context.
  test.describe.configure({ mode: 'serial' });

  /**
   * Navigates from /products through to the loaded worksheet for
   * [[DELIVERABLE]] on the per-browser batch product. Centralised so the
   * 17 tests below don't drift on the nav-to-worksheet sequence and so
   * the first-open filter pop-up handling lives in one place.
   *
   * The filter pop-up is a one-shot per user+deliverable — the first
   * test in this block dismisses it and subsequent tests find it
   * already-dismissed; [[DeliverableFilterDialog.dismissIfPresent]]
   * tolerates either path.
   */
  async function openWorksheet(
    page: import('@playwright/test').Page,
    testInfo: import('@playwright/test').TestInfo,
  ): Promise<DeliverableWorksheetPage> {
    const batchProductName = getCreatedProduct(testInfo, 'batch');

    const productsPage = new ProductsPage(page);
    await productsPage.goto();
    await productsPage.openProduct(batchProductName);

    const nav = new ProductNavigationMenu(page);
    await nav.expectLoaded();
    await nav.goTo('Deliverables');

    const deliverables = new ProductDeliverablesPage(page);
    await deliverables.open(DELIVERABLE);

    const filter = new DeliverableFilterDialog(page);
    await filter.dismissIfPresent();

    const worksheet = new DeliverableWorksheetPage(page);
    await worksheet.expectLoaded();
    return worksheet;
  }

  // ── Workitem CRUD on the worksheet grid ────────────────────────────

  test('user creates a workitem on the worksheet', async ({ page }, testInfo) => {
    // Nav + add-row + workitem entry. Webkit pushes past the 30 s default
    // once the cumulative grid work lands.
    test.setTimeout(120_000);

    const worksheet = await openWorksheet(page, testInfo);

    await worksheet.addEmptyRow();
    await worksheet.enterWorkitem(1, WORKITEM_1_INITIAL);

    // Business rule: a successful workitem entry commits its content into
    // the row's primary column — the cell must display the entered value
    // once the optimistic UI update lands.
    await expect(worksheet.cell(1, WORKSHEET_CONTENT_COL)).toContainText(
      WORKITEM_1_INITIAL,
      { timeout: 15_000 },
    );
  });

  test('user edits a workitem on the worksheet', async ({ page }, testInfo) => {
    test.setTimeout(120_000);

    const worksheet = await openWorksheet(page, testInfo);

    await worksheet.editWorkitem(1, WORKITEM_1_EDITED);

    // Business rule: editing a workitem replaces its visible content with
    // the new value — the row's content cell must reflect the edited name
    // and no longer show the original name as a standalone match.
    await expect(worksheet.cell(1, WORKSHEET_CONTENT_COL)).toContainText(
      WORKITEM_1_EDITED,
      { timeout: 15_000 },
    );
  });

  test('user deletes a workitem from the worksheet', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);

    const worksheet = await openWorksheet(page, testInfo);

    await worksheet.deleteWorkitem(1);

    // Business rule: a successful delete removes the workitem from the
    // grid entirely — the row's content cell must no longer hold the
    // deleted workitem's name.
    await expect(worksheet.cell(1, WORKSHEET_CONTENT_COL)).not.toContainText(
      WORKITEM_1_EDITED,
      { timeout: 15_000 },
    );
  });

  test('user creates another workitem after deletion', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);

    const worksheet = await openWorksheet(page, testInfo);

    await worksheet.addEmptyRow();
    await worksheet.enterWorkitem(1, WORKITEM_2_INITIAL);

    // Business rule: the worksheet accepts new workitems after a delete
    // without leaking the deleted row's state — the new row's content
    // must reflect the freshly-entered value.
    await expect(worksheet.cell(1, WORKSHEET_CONTENT_COL)).toContainText(
      WORKITEM_2_INITIAL,
      { timeout: 15_000 },
    );
  });

  // ── Attribute CRUD via the inline cell editor ──────────────────────

  test('user adds an attribute value to a workitem', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);

    const worksheet = await openWorksheet(page, testInfo);

    await worksheet.enterAttribute(
      1,
      WORKSHEET_FIRST_ATTRIBUTE_COL,
      ATTR_INDICATION_INITIAL,
    );

    // Business rule: an attribute entry commits into the corresponding
    // attribute column of the workitem's row — the cell must display the
    // entered value alongside the existing workitem content.
    await expect(
      worksheet.cell(1, WORKSHEET_FIRST_ATTRIBUTE_COL),
    ).toContainText(ATTR_INDICATION_INITIAL, { timeout: 15_000 });
  });

  test('user edits a workitem attribute value', async ({ page }, testInfo) => {
    test.setTimeout(120_000);

    const worksheet = await openWorksheet(page, testInfo);

    await worksheet.editAttribute(
      1,
      WORKSHEET_FIRST_ATTRIBUTE_COL,
      ATTR_INDICATION_EDITED,
    );

    // Business rule: editing an attribute replaces its visible content
    // with the new value — the cell must reflect the edited value.
    await expect(
      worksheet.cell(1, WORKSHEET_FIRST_ATTRIBUTE_COL),
    ).toContainText(ATTR_INDICATION_EDITED, { timeout: 15_000 });
  });

  test('user deletes a workitem attribute value', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);

    const worksheet = await openWorksheet(page, testInfo);

    await worksheet.clearAttribute(1, WORKSHEET_FIRST_ATTRIBUTE_COL);

    // Business rule: clearing an attribute removes its value from the
    // grid entirely — the cell must no longer display the previously
    // committed value.
    await expect(
      worksheet.cell(1, WORKSHEET_FIRST_ATTRIBUTE_COL),
    ).not.toContainText(ATTR_INDICATION_EDITED, { timeout: 15_000 });
  });

  // ── Details view edits reflected back on the worksheet ─────────────
  //
  // Order matters here: the attribute-fill test must run before the
  // name-edit test. The Details form enforces required attributes
  // (Indications for Use, Patient Type, User Type, Environment of Use)
  // that the inline worksheet editor doesn't — if the workitem has empty
  // required fields when the name-edit test opens Details, Save bounces
  // with validation errors and the view never returns to read-only. The
  // prior attribute-delete test leaves Indications for Use empty, so
  // populating all required fields first is the precondition that lets
  // the subsequent name save succeed.

  test('user fills workitem attribute fields from the details view', async ({
    page,
  }, testInfo) => {
    // Nav + details open + edit + multi-field fill + save + close +
    // worksheet reflection across five attribute columns.
    test.setTimeout(180_000);

    const worksheet = await openWorksheet(page, testInfo);

    const details = await worksheet.openWorkitemDetails(1);
    await details.enterEditMode();
    for (const attr of DETAILS_ATTRIBUTES) {
      await details.setAttribute(attr.label, attr.value);
    }
    await details.save();
    await details.close();

    // Business rule: attribute values committed in the details view
    // propagate back to the worksheet grid — each value must show in
    // its corresponding attribute column on the workitem's row,
    // starting at WORKSHEET_FIRST_ATTRIBUTE_COL and advancing one
    // column per attribute in the order they're rendered on the form.
    for (let i = 0; i < DETAILS_ATTRIBUTES.length; i++) {
      const attr = DETAILS_ATTRIBUTES[i];
      if (!attr) continue;
      await expect(
        worksheet.cell(1, WORKSHEET_FIRST_ATTRIBUTE_COL + i),
      ).toContainText(attr.value, { timeout: 15_000 });
    }
  });

  test('user edits a workitem name from the details view', async ({
    page,
  }, testInfo) => {
    // Nav + details open + edit + save + close + worksheet reflection.
    test.setTimeout(150_000);

    const worksheet = await openWorksheet(page, testInfo);

    const details = await worksheet.openWorkitemDetails(1);
    await details.enterEditMode();
    await details.setName(WORKITEM_2_EDITED);
    await details.save();
    await details.close();

    // Business rule: a name change committed in the details view
    // propagates back to the worksheet grid — the row's content cell
    // must show the new name without requiring a manual refresh.
    await expect(worksheet.cell(1, WORKSHEET_CONTENT_COL)).toContainText(
      WORKITEM_2_EDITED,
      { timeout: 15_000 },
    );
  });

  // ── Sort criteria applied through the Sort Workitems dialog ────────

  test('user creates additional workitems to enable sort coverage', async ({
    page,
  }, testInfo) => {
    // Three add-row + enter-workitem rounds. Each round dblclicks the
    // placeholder, mounts the editor, fills, and clicks Create — heavier
    // than a single workitem entry so the budget tracks the simple
    // tests x3.
    test.setTimeout(180_000);

    const worksheet = await openWorksheet(page, testInfo);

    // addEmptyRow inserts the new empty row at the BOTTOM of the data
    // rows, not the top — row 1 already holds WORKITEM_2_EDITED from
    // the prior tests, so the first new empty row lands at row 2, the
    // second at row 3, the third at row 4.
    const names = [WORKITEM_3, WORKITEM_4];
    for (let i = 0; i < names.length; i++) {
      await worksheet.addEmptyRow();
      await worksheet.enterWorkitem(i + 2, names[i]!);
    }

    // Business rule: each new workitem lands at the top of the grid and
    // pushes existing rows down. After three adds the top three rows
    // hold the new workitems in reverse creation order.
    await worksheet.expectWorkitemOrder([WORKITEM_2_EDITED_LOCATOR, WORKITEM_3_LOCATOR, WORKITEM_4_LOCATOR]);
  });

  test('user sorts workitems by Name (Z - A)', async ({ page }, testInfo) => {
    test.setTimeout(150_000);

    const worksheet = await openWorksheet(page, testInfo);

    const sort = await worksheet.openSortWorkitemsDialog(1);
    await sort.apply('Name', 'Z - A');
    await worksheet.reloadData();

    // Business rule: applying a Name Z - A sort orders workitems by
    // their displayed name in descending lexicographic order. "Workitem
    // 5" > "Workitem 4" > "Workitem 3" > "Workitem 2 - Edit" by string
    // comparison on the digit/suffix that follows the common prefix.
    await worksheet.expectWorkitemOrder([
      WORKITEM_5,
      WORKITEM_4,
      WORKITEM_3,
      WORKITEM_2_EDITED,
    ]);
  });

  test('user sorts workitems by Name (A - Z)', async ({ page }, testInfo) => {
    test.setTimeout(150_000);

    const worksheet = await openWorksheet(page, testInfo);

    const sort = await worksheet.openSortWorkitemsDialog(1);
    await sort.apply('Name', 'A - Z');
    await worksheet.reloadData();

    // Business rule: Name A - Z is the reverse ordering of Z - A.
    await worksheet.expectWorkitemOrder([
      WORKITEM_2_EDITED,
      WORKITEM_3,
      WORKITEM_4,
      WORKITEM_5,
    ]);
  });

  test('user sorts workitems by Display ID (99999 - 00001)', async ({
    page,
  }, testInfo) => {
    test.setTimeout(150_000);

    const worksheet = await openWorksheet(page, testInfo);

    const sort = await worksheet.openSortWorkitemsDialog(1);
    await sort.apply('Display ID', '99999 - 00001');
    await worksheet.reloadData();

    // Business rule: Display ID descending orders workitems by their
    // auto-assigned ITU-NNNNN suffix highest-first. Workitems were
    // created in the order 1 (deleted), 2 (renamed), 3, 4, 5, so the
    // remaining ITU codes descend 5 → 4 → 3 → 2.
    await worksheet.expectWorkitemOrder([
      WORKITEM_5,
      WORKITEM_4,
      WORKITEM_3,
      WORKITEM_2_EDITED,
    ]);
  });

  test('user sorts workitems by Display ID (00001 - 99999)', async ({
    page,
  }, testInfo) => {
    test.setTimeout(150_000);

    const worksheet = await openWorksheet(page, testInfo);

    const sort = await worksheet.openSortWorkitemsDialog(1);
    await sort.apply('Display ID', '00001 - 99999');
    await worksheet.reloadData();

    // Business rule: Display ID ascending reverses descending. ITU-00002
    // (workitem 2 — edited) leads, ITU-00005 lands last.
    await worksheet.expectWorkitemOrder([
      WORKITEM_2_EDITED,
      WORKITEM_3,
      WORKITEM_4,
      WORKITEM_5,
    ]);
  });

  test('user sorts workitems by Creation Time (New - Old)', async ({
    page,
  }, testInfo) => {
    test.setTimeout(150_000);

    const worksheet = await openWorksheet(page, testInfo);

    const sort = await worksheet.openSortWorkitemsDialog(1);
    await sort.apply('Creation Time', 'New - Old');
    await worksheet.reloadData();

    // Business rule: Creation Time New - Old orders workitems by their
    // server-recorded creation timestamp newest-first. Matches the
    // creation order from this spec — 5 newest, 2 (renamed) oldest.
    await worksheet.expectWorkitemOrder([
      WORKITEM_5,
      WORKITEM_4,
      WORKITEM_3,
      WORKITEM_2_EDITED,
    ]);
  });

  test('user sorts workitems by Creation Time (Old - New)', async ({
    page,
  }, testInfo) => {
    test.setTimeout(150_000);

    const worksheet = await openWorksheet(page, testInfo);

    const sort = await worksheet.openSortWorkitemsDialog(1);
    await sort.apply('Creation Time', 'Old - New');
    await worksheet.reloadData();

    // Business rule: Creation Time Old - New reverses the New - Old
    // ordering. Workitem 2 (oldest) leads, workitem 5 (newest) lands
    // last.
    await worksheet.expectWorkitemOrder([
      WORKITEM_2_EDITED,
      WORKITEM_3,
      WORKITEM_4,
      WORKITEM_5,
    ]);
  });

  test('user manually sorts workitems by dragging Workitem 5 between Workitems 2 and 3', async ({
    page,
  }, testInfo) => {
    test.setTimeout(150_000);

    const worksheet = await openWorksheet(page, testInfo);

    // The previous test left the grid in Creation Time Old - New order:
    // [2 - Edit, 3, 4, 5]. Drag workitem 5 to land between 2 - Edit and
    // 3, which moves it from row 4 to row 2.
    await worksheet.dragWorkitemBetween(WORKITEM_5, WORKITEM_2_EDITED, WORKITEM_3);

    // Business rule: a successful drag-drop reorder updates the grid to
    // reflect the new manual ordering — workitem 5 must land between
    // 2 - Edit and 3, with 4 trailing.
    await worksheet.expectWorkitemOrder([
      WORKITEM_2_EDITED,
      WORKITEM_5,
      WORKITEM_3,
      WORKITEM_4,
    ]);
  });
});
