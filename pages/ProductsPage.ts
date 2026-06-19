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

  /**
   * Search textbox inside the Intended Products tabpanel. Multiple "Search"
   * textboxes exist on the page (the Categories sidebar has its own), so
   * scoping by tabpanel is required for an unambiguous match.
   */
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.intendedProductButton = page.getByRole('button', { name: 'Intended Product' });
    this.searchInput = page
      .getByRole('tabpanel')
      .getByRole('textbox', { name: 'Search' });
  }

  /** Navigates the browser to the Products listing page. */
  async goto(): Promise<void> {
    await this.page.goto(ProductsPage.URL);
  }

  /**
   * Returns a locator for the row in the Intended Products table whose name
   * matches `productName` exactly. Scoped to the table (not the page) so it
   * cannot accidentally match the "Recently Visited" section or other panels
   * that surface product names in different markup.
   */
  productRow(productName: string): Locator {
    return this.page
      .getByRole('table')
      .getByRole('row')
      .filter({ has: this.page.getByText(productName, { exact: true }) });
  }

  /**
   * Filters the Intended Products table by typing `query` into its Search
   * box. Necessary before asserting a specific product exists, because the
   * unfiltered table virtualises/scrolls older entries out of the DOM as it
   * grows, and the newest product may not be rendered as a top-level row.
   */
  async searchProducts(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  /**
   * Deletes the product whose row matches `productName`. Searches the table
   * first so the row is guaranteed to be in the DOM (virtualisation may
   * scroll it off-screen otherwise), then clicks the row's Delete action
   * button and confirms the dialog.
   *
   * The Delete button is scoped to the matched row so we can't accidentally
   * trigger Delete on a different product. The confirmation Confirm button
   * is scoped to the dialog for the same reason.
   */
  async deleteProduct(productName: string): Promise<void> {
    await this.searchProducts(productName);
    // The Actions column holds three buttons in fixed order:
    //   [0] Edit   [1] Delete   [2] Derivatives
    // Their icon labels live in MUI Tooltips that only render on hover, so
    // they have no accessible name in the static a11y tree —
    // `getByRole('button', { name: 'Delete' })` finds nothing. Scope to the
    // row's last cell (Actions) and pick the middle button by index.
    await this.productRow(productName)
      .getByRole('cell')
      .last()
      .getByRole('button')
      .nth(1)
      .click();
    await this.page
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirm' })
      .click();
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

  /**
   * Filters the Intended Products table by `name` and opens the matching
   * product, navigating to its detail page. Exact match on the product
   * name so downstream specs reach the *specific* product they expect
   * rather than a stale historical row that happens to share a prefix.
   *
   * Click target is the product-name cell rather than the row itself:
   * only the name column's text is wired with the navigation handler in
   * the MUI table; clicking elsewhere in the row (toggle column, actions
   * cell) does not navigate.
   */
  async openProduct(name: string): Promise<void> {
    await this.searchProducts(name);
    await this.productRow(name)
      .getByText(name, { exact: true })
      .click();
  }
}
