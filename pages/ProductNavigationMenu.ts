import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

/**
 * Sections exposed by the product navigation menu. Each value matches the
 * underlying button's accessible name exactly, so it can be used directly
 * as a `getByRole('button', { name })` argument.
 */
export type ProductNavigationTab =
  | 'Deliverable Flow'
  | 'Live Data'
  | 'Lifecycle'
  | 'Feeds'
  | 'Activities'
  | 'Dashboard'
  | 'Settings'
  | 'Deliverables';

/**
 * Page-object component for the product navigation menu — the row of
 * section buttons that switches the main panel between Deliverable Flow,
 * Live Data, Lifecycle, Feeds, Activities, Dashboard, Settings, and
 * Deliverables.
 *
 * Exposes a single parameterised `goTo` rather than one method per tab so
 * adding or renaming a section only requires updating
 * [[ProductNavigationTab]] — there is no per-tab call site to chase.
 */
export class ProductNavigationMenu {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Locator for the navigation button matching `tab`. */
  tab(tab: ProductNavigationTab): Locator {
    return this.page.getByRole('button', { name: tab });
  }

  /** Activates the named navigation tab. */
  async goTo(tab: ProductNavigationTab): Promise<void> {
    await this.tab(tab).click();
  }

  /**
   * Asserts the navigation menu is rendered. Uses a generous timeout
   * because the authenticated shell can take noticeably longer than the
   * sign-in page to mount on Webkit's first paint.
   */
  async expectLoaded(): Promise<void> {
    await expect(this.tab('Deliverables')).toBeVisible({ timeout: 15_000 });
  }
}
