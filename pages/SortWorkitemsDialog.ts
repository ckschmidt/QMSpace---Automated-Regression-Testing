import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

/**
 * Sort fields the dialog exposes. Each value matches the menuitem text in
 * the field dropdown exactly, so it can be used directly as the argument
 * to a `getByText(..., { exact: true })` lookup.
 */
export type SortField = 'Name' | 'Display ID' | 'Creation Time';

/**
 * Sort order labels per field. The dialog reuses the same dropdown widget
 * for every field but the option text differs:
 *   - Name           → 'A - Z' / 'Z - A'
 *   - Display ID     → '00001 - 99999' / '99999 - 00001'
 *   - Creation Time  → 'Old - New' / 'New - Old'
 */
export type SortOrder =
  | 'A - Z'
  | 'Z - A'
  | '00001 - 99999'
  | '99999 - 00001'
  | 'Old - New'
  | 'New - Old';

/**
 * Page object for the Sort Workitems dialog — the modal opened from the
 * worksheet's row context menu via "Sort Workitems". Exposes a field
 * dropdown, an order dropdown, and a Confirm button.
 *
 * The dialog's two dropdown triggers are MUI Select wrappers rendered as
 * nested `<div>` containers with no role or accessible name, so they're
 * addressed by their generated emotion class hashes scoped to the dialog.
 * Swap these for data-testid lookups as soon as the app exposes them.
 */
export class SortWorkitemsDialog {
  readonly page: Page;
  readonly dialog: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole('dialog');
    this.confirmButton = this.dialog.getByRole('button', {
      name: 'Confirm',
      exact: true,
    });
  }

  /**
   * First dropdown in the dialog — the field the workitems are sorted by.
   * Targets the innermost clickable div of the first MUI Select wrapper
   * inside the dialog, matching the recorded `.css-1v5z18m > .css-iktssu >
   * .MuiBox-root` chain.
   */
  private get fieldDropdownTrigger(): Locator {
    return this.dialog
      .locator('.MuiBox-root.css-1v5z18m')
      .first()
      .locator('.MuiBox-root.css-iktssu > .MuiBox-root');
  }

  /** Second dropdown — the order applied to the selected field. */
  private get orderDropdownTrigger(): Locator {
    return this.dialog
      .locator('.MuiBox-root.css-1v5z18m')
      .nth(1)
      .locator('.MuiBox-root.css-iktssu > .MuiBox-root');
  }

  /**
   * Asserts the dialog is open and ready for input. Uses the Confirm
   * button as the canonical mount signal — present iff the dialog body
   * has rendered.
   */
  async expectVisible(): Promise<void> {
    await expect(this.confirmButton).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Opens the field dropdown and selects `field`. The option list mounts
   * as a `role="menu"` floating above the dialog, so the selection click
   * targets the menu (not the trigger) by exact text match.
   */
  async selectField(field: SortField): Promise<void> {
    await this.fieldDropdownTrigger.click();
    await this.page
      .getByRole('menu')
      .getByText(field, { exact: true })
      .click();
  }

  /**
   * Opens the order dropdown and selects `order`. Options are the per-field
   * order labels enumerated in [[SortOrder]] — callers should pass an order
   * that matches the field chosen in [[selectField]] (e.g. `A - Z` only
   * exists on the Name field).
   */
  async selectOrder(order: SortOrder): Promise<void> {
    await this.orderDropdownTrigger.click();
    await this.page
      .getByRole('menu')
      .getByText(order, { exact: true })
      .click();
  }

  /**
   * Commits the chosen field+order pair. The dialog dismisses on a
   * successful confirm — wait for it to leave the DOM so downstream
   * actions (Reload Data, order assertions) don't race the unmount.
   */
  async confirm(): Promise<void> {
    await this.confirmButton.click();
    await expect(this.confirmButton).toBeHidden({ timeout: 15_000 });
  }

  /**
   * High-level workflow: pick a field, pick an order, confirm. Tests should
   * call this rather than the per-step methods so the spec reads as a
   * single intent.
   */
  async apply(field: SortField, order: SortOrder): Promise<void> {
    await this.selectField(field);
    await this.selectOrder(order);
    await this.confirm();
  }
}
