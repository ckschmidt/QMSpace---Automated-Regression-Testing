import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

/**
 * Shape of the test data required to fill the "Intended Product" form.
 * Centralising this here lets individual specs declare a product as a plain
 * object instead of passing six positional strings.
 */
export interface IntendedProductInput {
  parentFolder: string;
  name: string;
  description: string;
  category: string;
  template: string;
  lifeCycle: string;
}

/**
 * Page object for the "Intended Product" creation form (a Material-UI modal
 * opened from the Products page).
 *
 * A few MUI dropdowns expose no stable accessible name; the CSS-based
 * fallbacks are isolated here so a markup change only needs one edit. These
 * locators should be swapped for data-testid lookups as soon as the app
 * exposes them.
 */
export class IntendedProductForm {
  readonly page: Page;

  readonly parentFolderInput: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly categoryPlaceholder: Locator;
  readonly templateSelector: Locator;
  readonly lifeCycleSelector: Locator;
  readonly createButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Parent Folder is the first textbox in the create-product dialog (the
    // IsFolder row above it is a radiogroup, not a textbox). We click the
    // textbox's *parent* — the MUI OutlinedInput wrapper — because the
    // readonly <input> itself fails Webkit's hit-test actionability check
    // (the MUI fieldset/end-adornment overlay sits on top of it).
    this.parentFolderInput = page
      .getByRole('dialog')
      .getByRole('textbox')
      .first()
      .locator('xpath=..');
    this.nameInput = page.getByRole('textbox', { name: 'Please Enter Intended Product Name' });
    this.descriptionInput = page.getByRole('textbox', { name: 'Please Enter Description' });

    // The category dropdown's collapsed state is a plain <div> with no role
    // or accessible name; matched via its visible placeholder text.
    this.categoryPlaceholder = page
      .locator('div')
      .filter({ hasText: /^Please select a category$/ })
      .nth(1);

    // MUI custom dropdowns with no accessible names — see class-level note.
    this.templateSelector = page
      .locator('.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-12 > .MuiBox-root.css-hjj3e7 > .MuiBox-root')
      .first();
    this.lifeCycleSelector = page.locator(
      'div:nth-child(12) > .MuiBox-root.css-hjj3e7 > .MuiBox-root',
    );

    this.createButton = page.getByRole('button', { name: 'Create' });
  }

  /**
   * Asserts the modal is open and ready for input. Uses a generous timeout
   * because Webkit can take noticeably longer than Chromium/Firefox to mount
   * the MUI dialog tree on first render.
   */
  async expectLoaded(): Promise<void> {
    await expect(this.nameInput).toBeVisible({ timeout: 15_000 });
    await expect(this.createButton).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Opens the Parent Folder dropdown and selects the named option.
   * Parent Folder is required — without it the Create button silently fails
   * client-side validation and the modal does not close.
   *
   * Click target is the `<li role="listitem">` ancestor: the inner text span
   * has no click handler, so targeting it directly stalls Firefox/Webkit's
   * actionability check. MUI also uses `listitem` here rather than the more
   * common `menuitem` role, so we filter `getByRole('listitem')` by exact
   * text via a nested `has` clause.
   */
  async selectParentFolder(name: string): Promise<void> {
    await this.parentFolderInput.click();
    await this.page
      .getByRole('menu')
      .getByRole('listitem')
      .filter({ has: this.page.getByText(name, { exact: true }) })
      .click();
  }

  /** Fills the required Intended Product name. */
  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  /** Fills the product description. */
  async fillDescription(description: string): Promise<void> {
    await this.descriptionInput.fill(description);
  }

  /**
   * Opens the category dropdown, checks the matching category's checkbox,
   * and closes the menu with Escape. MUI does not auto-close multi-select
   * menus on each pick; pressing Escape is stable across DOM variations
   * (multiple MuiBackdrop elements coexist when the dialog itself is a MUI
   * modal, breaking backdrop-click locators with strict-mode violations).
   */
  async selectCategory(category: string): Promise<void> {
    await this.categoryPlaceholder.click();
    await this.page
      .getByRole('listitem')
      .filter({ hasText: category })
      .getByRole('checkbox')
      .check();
    await this.page.keyboard.press('Escape');
  }

  /** Opens the Template dropdown and selects the named option. */
  async selectTemplate(template: string): Promise<void> {
    await this.templateSelector.click();
    await this.page.getByText(template, { exact: true }).click();
  }

  /** Opens the life-cycle dropdown and selects the named option. */
  async selectLifeCycle(lifeCycle: string): Promise<void> {
    await this.lifeCycleSelector.click();
    await this.page.getByText(lifeCycle, { exact: true }).click();
  }

  /** Submits the form by clicking Create. */
  async submit(): Promise<void> {
    await this.createButton.click();
  }

  /**
   * High-level workflow: fills every required field for `product` and submits.
   * Tests should call this rather than the per-field methods so the spec
   * reads as a single intent.
   */
  async createProduct(product: IntendedProductInput): Promise<void> {
    await this.selectParentFolder(product.parentFolder);
    await this.fillName(product.name);
    await this.fillDescription(product.description);
    await this.selectCategory(product.category);
    await this.selectTemplate(product.template);
    await this.selectLifeCycle(product.lifeCycle);
    await this.submit();
  }
}
