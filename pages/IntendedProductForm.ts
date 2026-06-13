import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

/**
 * One module step in the batch workflow.
 *
 * - `all`: click the "Select All" button to enable every deliverable in the
 *   module (used by Design Controls, Risk Management, etc. where the user
 *   wants a complete task set).
 * - `single`: check the lone visible deliverable checkbox (used by modules
 *   like Index File Management that surface a single item).
 */
export interface ModuleSelection {
  name: string;
  strategy: 'all' | 'single';
}

/**
 * Shape of the test data required to fill the "Intended Product" form.
 * Centralising this here lets individual specs declare a product as a plain
 * object instead of passing six positional strings.
 *
 * The trailing fields (`description`, `enableBatch`, `modules`) are optional
 * so that simple creation flows can omit them; batch flows opt in by setting
 * `enableBatch: true` and providing a `modules` array.
 */
export interface IntendedProductInput {
  parentFolder: string;
  name: string;
  description?: string;
  category: string;
  template: string;
  lifeCycle: string;
  enableBatch?: boolean;
  modules?: ModuleSelection[];
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
  readonly enableBatchRadio: Locator;
  readonly nextButton: Locator;
  readonly selectAllButton: Locator;
  readonly applyButton: Locator;
  readonly createButton: Locator;

  /**
   * The label of whichever module is currently active in the batch sub-flow.
   * The module-switcher trigger button takes the active module's name, so we
   * need to track this to know which button to click to open the switcher.
   * Set lazily when `enableBatch()` is called.
   */
  private currentModule = '';

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

    // The second "Yes" radio in the dialog toggles batch task creation —
    // the first "Yes" is the IsFolder field above. Scope to the dialog so
    // unrelated "Yes" radios on the page can't shift the index.
    this.enableBatchRadio = page
      .getByRole('dialog')
      .getByRole('radio', { name: 'Yes' })
      .nth(1);
    // Batch sub-flow controls — scoped to the dialog so a stray same-named
    // button elsewhere on the page can't be picked instead.
    this.nextButton = page.getByRole('dialog').getByRole('button', { name: 'Next' });
    this.selectAllButton = page
      .getByRole('dialog')
      .getByRole('button', { name: 'Select All' });
    this.applyButton = page.getByRole('dialog').getByRole('button', { name: 'Apply' });
    this.createButton = page.getByRole('dialog').getByRole('button', { name: 'Create' });
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
   * Enables batch task creation (the "Create Tasks in batch?" Yes radio).
   * After enabling batch, the form swaps the bottom Create button for Next,
   * which opens the module/deliverable sub-flow.
   *
   * Waits for the radio's checked state to settle and for Next to become
   * visible — without this, Chromium/Webkit can fire the Next click during
   * React's re-render before the new button's onClick handler is bound, and
   * the click silently no-ops.
   */
  async enableBatch(): Promise<void> {
    await this.enableBatchRadio.check();
    await expect(this.enableBatchRadio).toBeChecked();
    await expect(this.nextButton).toBeVisible();
    this.currentModule = 'Design Controls';
  }

  /**
   * Advances from the main form into the batch module sub-flow. Asserts the
   * sub-flow's canonical signal (Select All) appears afterwards so a silent
   * non-transition fails fast here instead of cascading into a confusing
   * locator timeout in the next step.
   *
   * The first click can race React's onClick handler binding on Chromium /
   * Webkit (Firefox is slower and consistently lands after binding). If the
   * form hasn't transitioned within 3 s and Next is still visible, click
   * again — by then the handler is definitely bound.
   */
  async clickNext(): Promise<void> {
    await this.nextButton.click();
    try {
      await expect(this.selectAllButton).toBeVisible({ timeout: 3_000 });
      return;
    } catch {
      // Fall through to retry below.
    }
    if (await this.nextButton.isVisible()) {
      await this.nextButton.click();
    }
    await expect(this.selectAllButton).toBeVisible({ timeout: 12_000 });
  }

  /**
   * Switches the batch sub-flow to a different module. Clicks the current
   * module's trigger button (which doubles as the switcher) and selects the
   * target module from the menu that opens.
   */
  async switchToModule(name: string): Promise<void> {
    await this.page.getByRole('button', { name: this.currentModule }).click();
    // Unlike the Parent Folder dropdown (which uses unnamed <li> elements),
    // the module switcher exposes each option as a real role="menuitem" with
    // the module name as its accessible name, so we can target by role+name.
    await this.page.getByRole('menu').getByRole('menuitem', { name }).click();
    // The switcher trigger button takes the active module's name. Waiting
    // for it to reflect the new module proves the panel finished swapping —
    // without this, the next action (Select All / checkbox check) can race
    // the unmount of the previous module's content and target a transient
    // element that disappears before its state can stick.
    await expect(
      this.page.getByRole('dialog').getByRole('button', { name }),
    ).toBeVisible({ timeout: 10_000 });
    this.currentModule = name;
  }

  /**
   * Clicks Select All to enable every deliverable, then Apply.
   *
   * Guards on both ends of the Select All click: waits for the module panel
   * to actually have a checkbox to act on (otherwise Select All is a no-op
   * against an empty list), and verifies at least one checkbox ends up
   * checked afterwards. Without these guards, an early Select All silently
   * commits an empty selection — visible only as a downstream submit
   * rejection.
   */
  async selectAllAndApply(): Promise<void> {
    const firstCheckbox = this.page.getByRole('dialog').getByRole('checkbox').first();
    await expect(firstCheckbox).toBeVisible({ timeout: 10_000 });
    await this.selectAllButton.click();
    await expect(firstCheckbox).toBeChecked();
    await this.applyButton.click();
    await this.waitForApplyToSettle();
  }

  /**
   * Checks the single visible deliverable checkbox in the current module,
   * then Apply. Used for modules like "Index File Management" that surface
   * a single deliverable.
   *
   * Verifies the checkbox actually ends up checked before clicking Apply —
   * without this, a stale or transient checkbox can pass `.check()` but be
   * unmounted before its state persists, leading to Apply committing an
   * empty selection and Create silently rejecting at submit.
   */
  async selectSingleDeliverableAndApply(): Promise<void> {
    const checkbox = this.page.getByRole('dialog').getByRole('checkbox').first();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await this.applyButton.click();
    await this.waitForApplyToSettle();
  }

  /**
   * Lets the server-side commit triggered by an Apply click finish before
   * the next module switch or the final Create. Without this gate, fast
   * test playback can fire the Create click while an Apply's POST is still
   * in flight; the form quietly rejects submission and the dialog stays
   * open with no visible error.
   *
   * The app keeps a SignalR/WebSocket connection open (the `api/hub/common`
   * channel observed in network logs) which prevents `networkidle` from
   * ever firing on Chromium. The 10 s budget acts as a "best effort" — if
   * idle is reached we proceed immediately; if not, we've still given any
   * Apply POST plenty of time to flush, so we swallow the timeout.
   */
  private async waitForApplyToSettle(): Promise<void> {
    await this.page
      .waitForLoadState('networkidle', { timeout: 10_000 })
      .catch(() => {
        /* persistent SignalR connection keeps the bus warm — proceed anyway */
      });
  }

  /**
   * High-level workflow: fills every required field for `product` and submits.
   * Tests should call this rather than the per-field methods so the spec
   * reads as a single intent.
   *
   * When `product.enableBatch` is true, walks through `product.modules` in
   * order, applying each module's selection strategy. Skips the module
   * switcher when the requested module is already active (Design Controls is
   * the default after clicking Next, so it should appear first in the array).
   */
  async createProduct(product: IntendedProductInput): Promise<void> {
    await this.selectParentFolder(product.parentFolder);
    await this.fillName(product.name);
    if (product.description !== undefined) {
      await this.fillDescription(product.description);
    }
    await this.selectCategory(product.category);
    await this.selectTemplate(product.template);
    await this.selectLifeCycle(product.lifeCycle);

    if (product.enableBatch) {
      await this.enableBatch();
      await this.clickNext();

      for (const mod of product.modules ?? []) {
        if (mod.name !== this.currentModule) {
          await this.switchToModule(mod.name);
        }
        if (mod.strategy === 'all') {
          await this.selectAllAndApply();
        } else {
          await this.selectSingleDeliverableAndApply();
        }
      }
    }

    await this.submit();
  }
}
