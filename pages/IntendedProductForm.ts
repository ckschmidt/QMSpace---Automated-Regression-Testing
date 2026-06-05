import type { Page, Locator } from '@playwright/test';
import type { TestProduct, ProductModule } from './TestProduct.js';

/**
 * Page object for the "Intended Product" creation form/modal.
 * Some Material-UI dropdowns expose no stable accessible name, so a small
 * number of locators fall back to CSS. They are isolated here so they can be
 * updated in one place if the markup changes.
 */
export class IntendedProductForm {
  readonly page: Page;

  readonly parentIdInput: Locator;
  readonly nameInput: Locator;
  readonly categoryPlaceholder: Locator;
  readonly openMenu: Locator;
  readonly menuBackdrop: Locator;
  readonly deviceTechnologySelector: Locator;
  readonly lifeCycleSelector: Locator;
  readonly enableDesignControlsRadio: Locator;
  readonly nextButton: Locator;
  readonly selectAllButton: Locator;
  readonly applyButton: Locator;
  readonly createButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.parentIdInput = page.locator('input[name="parentId"]');
    this.nameInput = page.getByRole('textbox', { name: 'Please Enter Intended Product Name' });
    this.categoryPlaceholder = page.getByText('Please select a category', { exact: true });
    this.openMenu = page.getByRole('menu');
    this.menuBackdrop = page.locator('.MuiPopover-root.MuiMenu-root .MuiBackdrop-root');

    this.deviceTechnologySelector = page
      .locator('.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-12 > .MuiBox-root.css-hjj3e7 > .MuiBox-root')
      .first();
    this.lifeCycleSelector = page.locator('div:nth-child(12) > .MuiBox-root.css-hjj3e7 > .MuiBox-root');

    this.enableDesignControlsRadio = page.getByRole('radio', { name: 'Yes' }).nth(1);
    this.nextButton = page.getByRole('button', { name: 'Next' });
    this.selectAllButton = page.getByRole('button', { name: 'Select All' });
    this.applyButton = page.getByRole('button', { name: 'Apply' });
    this.createButton = page.getByRole('button', { name: 'Create' });
  }

  async selectParentProduct(name: string): Promise<void> {
    await this.parentIdInput.click();
    await this.openMenu.getByText(name, { exact: true }).click();
  }

  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  async selectCategory(category: string): Promise<void> {
    await this.categoryPlaceholder.click();
    await this.page
      .getByRole('listitem')
      .filter({ hasText: category })
      .getByRole('checkbox')
      .check();
    await this.menuBackdrop.click();
  }

  async selectDeviceTechnology(technology: string): Promise<void> {
    await this.deviceTechnologySelector.click();
    await this.page.getByText(technology, { exact: true }).click();
  }

  async selectLifeCycle(lifeCycle: string): Promise<void> {
    await this.lifeCycleSelector.click();
    await this.page.getByText(lifeCycle, { exact: true }).click();
  }

  async enableDesignControls(): Promise<void> {
    await this.enableDesignControlsRadio.check();
  }

  /**
   * Open the module switcher and select `module`. In the recorded flow the
   * currently-active module ("Design Controls") doubles as the switcher
   * button — clicking it reveals the list of other modules.
   */
  async switchToModule(module: ProductModule): Promise<void> {
    await this.page.getByRole('button', { name: 'Design Controls' }).click();
    await this.page.getByText(module, { exact: true }).click();
  }

  async selectAllAndApply(): Promise<void> {
    await this.selectAllButton.click();
    await this.applyButton.click();
  }

  async clickNext(): Promise<void> {
    await this.nextButton.click();
  }

  async submit(): Promise<void> {
    await this.createButton.click();
  }

  /**
   * High-level workflow that fills the form for `product` and submits it.
   * If `product.enableDesignControls` is true, walks through the module steps
   * (Design Controls, Risk Management, ...) before creating.
   */
  async createProduct(product: TestProduct): Promise<void> {
    await this.selectParentProduct(product.parentProduct);
    await this.fillName(product.name);
    await this.selectCategory(product.category);
    await this.selectDeviceTechnology(product.deviceTechnology);
    await this.selectLifeCycle(product.lifeCycle);

    if (product.enableDesignControls) {
      await this.enableDesignControls();
      await this.clickNext();
      await this.selectAllAndApply();

      for (const module of product.modules ?? []) {
        await this.switchToModule(module);
        await this.selectAllAndApply();
      }
    }

    await this.submit();
  }
}