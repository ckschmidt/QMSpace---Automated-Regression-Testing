import type { Page, Locator } from '@playwright/test';
import { IntendedProductForm } from './IntendedProductForm.js';

export class ProductsPage {
  readonly page: Page;
  readonly productsNavLink: Locator;
  readonly intendedProductButton: Locator;
  readonly productExpandButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productsNavLink = this.page.getByRole('link', { name: 'Products' });
    this.intendedProductButton = this.page.getByRole('button', { name: 'Intended Product' });
    this.productExpandButton = this.page
      .getByRole('cell', { name: 'expand row Automated' })
      .getByLabel('expand row');
  }

  async goto(): Promise<void> {
    await this.productsNavLink.click();
  }

  async openIntendedProductForm(): Promise<IntendedProductForm> {
    await this.intendedProductButton.click();
    return new IntendedProductForm(this.page);
  }

  async selectProduct(productName: string): Promise<void> {
    await this.productExpandButton.click();
    await this.page.getByText(productName, { exact: true }).click();
  }
}