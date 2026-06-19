import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { WorkitemDetailsPage } from './WorkitemDetailsPage.js';
import { SortWorkitemsDialog } from './SortWorkitemsDialog.js';

/**
 * Column indices in the standard deliverable worksheet grid. Cells are
 * addressed by 1-based `.cell_${row}_${col}` class names in the rendered
 * DOM; col 2 holds the row's primary content — the workitem text (e.g.
 * the "Intended Use" or "User Need" entry depending on the deliverable);
 * col 3 holds the row's first attribute (e.g. "Indications for Use" on
 * the Intended Use Statement deliverable). Exposed as named constants so
 * specs can express column intent rather than passing a magic number
 * around.
 */
export const WORKSHEET_CONTENT_COL = 2;
export const WORKSHEET_FIRST_ATTRIBUTE_COL = 3;

/**
 * Page object for the spreadsheet-style worksheet that backs each
 * deliverable. The worksheet is the editing surface reached after opening
 * a deliverable from [[ProductDeliverablesPage]] — rows hold the
 * deliverable's workitems (intended uses, user needs, hazards, etc.
 * depending on the deliverable) and each row's columns hold the workitem
 * text and its attributes.
 *
 * The grid uses 1-based `.cell_${row}_${col}` class names as the only
 * stable per-cell handle. The workitem editor mounts with
 * `id="workitem-editor-box-t_<row-uid>"` (timestamp+UUID suffix per row),
 * so we match by ID *prefix* rather than chase the per-row tail.
 *
 * Editor commit buttons are role-by-name with two distinct meanings:
 *   - **Create**  — commits a brand-new value (the cell was empty before).
 *   - **Confirm** — commits an edit to an existing value, or confirms a
 *                   destructive modal (Delete Workitem, Sort apply, etc.).
 * The methods below pick whichever button matches the situation.
 */
export class DeliverableWorksheetPage {
  readonly page: Page;

  /**
   * Commits a workitem entry from the inline workitem editor when the
   * cell was previously empty. Only visible while the editor is open on
   * an empty cell, so a page-level role lookup is unambiguous in the
   * worksheet view.
   */
  readonly createButton: Locator;

  /**
   * Commits an edit to an existing workitem or attribute value, and also
   * confirms destructive modals (Delete Workitem, Sort Workitems). Same
   * accessible name across all three uses — there's never more than one
   * Confirm button visible at a time on the worksheet view.
   */
  readonly confirmButton: Locator;

  /**
   * Clears the current value in the open inline editor. Visible only
   * while the editor is open on a cell with content; used by
   * [[clearAttribute]] to remove an attribute value before committing.
   */
  readonly clearButton: Locator;

  /**
   * Forces a refresh of the worksheet grid from the server. Sort changes
   * commit dialog-side but the grid sometimes lags behind — clicking
   * Reload Data is the canonical post-sort settle action used by the
   * recorded flow.
   */
  readonly reloadDataButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createButton = page.getByRole('button', { name: 'Create', exact: true });
    this.confirmButton = page.getByRole('button', { name: 'Confirm', exact: true });
    this.clearButton = page.getByRole('button', { name: 'Clear', exact: true });
    this.reloadDataButton = page.getByRole('button', { name: 'Reload Data' });
  }

  /**
   * 1-based locator for a worksheet cell at `(row, col)`. The grid encodes
   * coordinates directly into each cell's class list, which is the only
   * stable per-cell handle the markup exposes.
   */
  cell(row: number, col: number): Locator {
    return this.page.locator(`.cell_${row}_${col}`);
  }

  /**
   * Read-only placeholder cell that, when double-clicked, inserts a new
   * empty row into the worksheet. Matches the recorded selector — a
   * non-primary-column cell of a `not-allowed` (non-editable) content row.
   * `.first()` picks the first such cell in document order, which is the
   * top of the placeholder strip the grid uses to expose the add-row
   * affordance.
   */
  get addRowPlaceholder(): Locator {
    return this.page
      .locator('.bg-grey.content-row.not-allowed.not-primary-col')
      .first();
  }

  /**
   * Active cell editor that mounts after double-clicking any editable
   * cell. The workitem (content) column pops up a wrapper
   * `<div id="workitem-editor-box-t_<row-uid>">` over the cell, while
   * attribute columns mount a separate spreadsheet-style strip editor
   * below the grid that has no `workitem-editor-box-` id at all. Both
   * editors expose a single `role="textbox"` input that takes focus on
   * mount, so focus is the only stable cross-column signal — keying off
   * the id prefix misses the attribute editor entirely.
   *
   * Presence of this element is the canonical signal that the cell is
   * accepting input.
   */
  get workitemEditor(): Locator {
    return this.page.getByRole('textbox').and(this.page.locator(':focus'));
  }

  /**
   * Asserts the worksheet grid is rendered and ready for input. The
   * add-row placeholder is the canonical "grid mounted" signal — if it's
   * visible the row body and add affordance are both in the DOM.
   */
  async expectLoaded(): Promise<void> {
    await expect(this.addRowPlaceholder).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Inserts a new empty row into the worksheet by double-clicking the
   * add-row placeholder. The new row always lands at row index 1 (the
   * grid renders newest rows at the top of the body). The row is created
   * empty — no workitem is entered until [[enterWorkitem]] is called.
   */
  async addEmptyRow(): Promise<void> {
    await this.addRowPlaceholder.dblclick();
  }

  /**
   * Enters a workitem with `content` into the row at `row`. Walks the
   * recorded flow: dblclick the row's content cell to mount the workitem
   * editor → fill it → commit via Create.
   *
   * A row must already exist at `row` — callers should [[addEmptyRow]]
   * first when starting from a deliverable with no workitems. The row
   * is the addressable shell; the workitem is the actual content the
   * user types into it.
   */
  async enterWorkitem(row: number, content: string): Promise<void> {
    await this.cell(row, WORKSHEET_CONTENT_COL).dblclick();
    await this.workitemEditor.fill(content);
    await this.createButton.click();
  }

  /**
   * Replaces the workitem content at `row` with `newContent`. Same
   * editor flow as [[enterWorkitem]] but commits with Confirm — the
   * cell already holds a value, so the editor's primary button changes
   * from "Create" to "Confirm".
   */
  async editWorkitem(row: number, newContent: string): Promise<void> {
    await this.cell(row, WORKSHEET_CONTENT_COL).dblclick();
    await this.workitemEditor.fill(newContent);
    await this.confirmButton.click();
  }

  /**
   * Right-click → Delete Workitem → Confirm. The delete confirmation
   * surfaces as a side panel with a "Hide Panel" button — *not* a MUI
   * modal with `role="dialog"` — so scoping the Confirm lookup to
   * `getByRole('dialog')` finds nothing and times out. The page-wide
   * [[confirmButton]] is unambiguous here: the context menu has already
   * dismissed by the time the panel renders, so no editor Confirm can
   * race with the panel's.
   */
  async deleteWorkitem(row: number): Promise<void> {
    await this.cell(row, WORKSHEET_CONTENT_COL).click({ button: 'right' });
    await this.page.getByText('Delete Workitem', { exact: true }).click();
    await this.confirmButton.click();
  }

  /**
   * Adds an attribute value to the cell at `(row, col)`. The attribute
   * strip editor exposes a single Clear button — no Create/Confirm —
   * so commit is keyboard-driven: Enter persists the typed value and
   * dismisses the strip. This differs from [[enterWorkitem]], which
   * uses the popup editor's explicit Create button.
   */
  async enterAttribute(row: number, col: number, value: string): Promise<void> {
    await this.cell(row, col).dblclick();
    await this.workitemEditor.fill(value);
    await this.page.keyboard.press('Enter');
  }

  /**
   * Replaces an existing attribute value at `(row, col)`. Same
   * Enter-to-commit contract as [[enterAttribute]] — the strip editor
   * doesn't distinguish Create from Confirm, so a single commit path
   * covers both empty-cell and existing-value edits.
   */
  async editAttribute(row: number, col: number, newValue: string): Promise<void> {
    await this.cell(row, col).dblclick();
    await this.workitemEditor.fill(newValue);
    await this.page.keyboard.press('Enter');
  }

  /**
   * Removes the attribute value at `(row, col)` by opening the editor
   * and committing an empty value via Enter. The strip editor's Clear
   * button empties the visible input but doesn't mark the field dirty,
   * so a follow-up Enter is treated as a cancel and the original value
   * sticks. `fill('')` selects-all-and-types-empty, which the input
   * recognises as a change — Enter then persists the empty value.
   */
  async clearAttribute(row: number, col: number): Promise<void> {
    await this.cell(row, col).dblclick();
    await this.workitemEditor.fill('');
    await this.page.keyboard.press('Enter');
  }

  /**
   * Opens the row's context menu and activates Details, dismissing back
   * to the worksheet view requires [[WorkitemDetailsPage.close]]. Returns
   * the details POM with its loaded-state precondition already met so
   * callers can chain straight into edit-mode actions.
   */
  async openWorkitemDetails(row: number): Promise<WorkitemDetailsPage> {
    await this.cell(row, WORKSHEET_CONTENT_COL).click({ button: 'right' });
    // "Details" also appears in the side-panel tab strip (Flow / Details
    // / Change History / Graph), so a bare getByText match is ambiguous.
    // The context menu renders each entry as a table cell while the tab
    // strip uses a plain generic — scoping by role='cell' lands on the
    // menu item unambiguously and doesn't depend on a fragile nth index.
    await this.page
      .getByRole('cell', { name: 'Details', exact: true })
      .click();
    const details = new WorkitemDetailsPage(this.page);
    await details.expectLoaded();
    return details;
  }

  /**
   * Opens the row's context menu and activates Sort Workitems. Returns
   * the dialog POM with its visible-state precondition already met so
   * callers can immediately apply a sort.
   */
  async openSortWorkitemsDialog(row: number): Promise<SortWorkitemsDialog> {
    await this.cell(row, WORKSHEET_CONTENT_COL).click({ button: 'right' });
    await this.page.getByText('Sort Workitems', { exact: true }).click();
    const dialog = new SortWorkitemsDialog(this.page);
    await dialog.expectVisible();
    return dialog;
  }

  /**
   * Forces a server refresh of the worksheet grid. Use after a sort
   * commit so the visible row order reflects the new sort criteria —
   * without this, the grid sometimes shows stale ordering for a few
   * seconds while the cached client-side view catches up.
   */
  async reloadData(): Promise<void> {
    await this.reloadDataButton.click();
  }

  /**
   * Returns the current text of the content cell at `row`. Used by sort
   * and drag-drop tests to assert the visible row order against the
   * expected workitem sequence.
   */
  async workitemAt(row: number): Promise<string> {
    return (await this.cell(row, WORKSHEET_CONTENT_COL).innerText()).trim();
  }

  /**
   * Asserts the visible content column matches `expected` row-by-row.
   * Uses [[expect.toHaveText]] under the hood so each assertion benefits
   * from Playwright's auto-retry without callers re-rolling polling
   * logic. Pass exact, full cell text per row — leading/trailing
   * whitespace tolerated by [[expect]]'s default normalisation.
   */
  async expectWorkitemOrder(expected: readonly string[]): Promise<void> {
    for (let i = 0; i < expected.length; i++) {
      await expect(this.cell(i + 1, WORKSHEET_CONTENT_COL)).toHaveText(
        expected[i] ?? '',
        { timeout: 15_000 },
      );
    }
  }

  /**
   * Drags the content cell whose text matches `source` to land between
   * the cells matching `before` (the row that should immediately precede
   * the dropped row) and `after` (the row that should immediately follow
   * it). The grid responds to standard HTML5 drag events on the row's
   * content cell — Playwright's codegen never captured the mousedown/
   * mousemove pair, so we drive it manually here.
   *
   * Drop target is the `after` row's content cell — the grid inserts
   * the dragged row *above* the drop target, which is what "between
   * `before` and `after`" means in row order. A halfway hover step
   * gives any drop-zone hit-test enough mousemove events to register
   * the drop slot, which Chromium otherwise treats as a single jump
   * and silently no-ops.
   */
  async dragWorkitemBetween(
    source: string,
    before: string,
    after: string,
  ): Promise<void> {
    const sourceCell = this.contentCellByText(source);
    const beforeCell = this.contentCellByText(before);
    const afterCell = this.contentCellByText(after);
    await sourceCell.scrollIntoViewIfNeeded();
    await sourceCell.hover();
    await this.page.mouse.down();
    // Move halfway first so the drag is registered as a sustained
    // motion, not a single instantaneous jump.
    await beforeCell.hover();
    await afterCell.hover();
    await this.page.mouse.up();
  }

  /**
   * Locator for the worksheet cell whose visible text contains `text`.
   * Used by [[dragWorkitemBetween]] to address rows by their workitem
   * name rather than by row index — the row index is unstable after
   * sort/reorder operations.
   *
   * Scoped to the worksheet cell class pair (`.scrollbar-hidden
   * .cell-max-height`) shared by every grid cell, so a stray header or
   * side-panel occurrence of the same text can't be matched.
   */
  private contentCellByText(text: string): Locator {
    return this.page
      .locator('.scrollbar-hidden.cell-max-height')
      .filter({ hasText: text })
      .first();
  }
}
