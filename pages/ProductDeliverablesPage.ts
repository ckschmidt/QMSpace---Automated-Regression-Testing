import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the Deliverables panel — the view shown after activating
 * the Deliverables tab in [[ProductNavigationMenu]]. Each deliverable is
 * rendered with its title as the accessible label of its container, so a
 * single `getByLabel` lookup is sufficient to address any of them by name.
 */
export class ProductDeliverablesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Locator for the deliverable card whose label exactly matches `label`. */
  deliverable(label: string): Locator {
    return this.page.getByLabel(label);
  }

  /** Opens the deliverable whose label exactly matches `label`. */
  async open(label: string): Promise<void> {
    await this.deliverable(label).click();
  }
}
