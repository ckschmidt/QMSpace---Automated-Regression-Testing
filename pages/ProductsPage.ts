import type { Page, Locator } from '@playwright/test';
import { IntendedProductForm } from './IntendedProductForm.js';

/**
 * Page object for the Products listing page. Acts as the entry point into
 * the Intended Product creation workflow.
 */
export class ProductsPage {
  static readonly URL = 'https://auto.qmsgpt.net/products';

  readonly page: Page;

  /** Toolbar button that opens the "Intended Product" creation modal. */
  readonly intendedProductButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.intendedProductButton = page.getByRole('button', { name: 'Intended Product' });
  }

  /** Navigates the browser to the Products listing page. */
  async goto(): Promise<void> {
    await this.page.goto(ProductsPage.URL);
  }

  /**
   * Opens the "Intended Product" creation form and returns its page object,
   * so callers can drive the workflow in one chained block without a second
   * instantiation at the call site.
   */
  async openIntendedProductForm(): Promise<IntendedProductForm> {
    await this.intendedProductButton.click();
    const form = new IntendedProductForm(this.page);
    await form.expectLoaded();
    return form;
  }
}
