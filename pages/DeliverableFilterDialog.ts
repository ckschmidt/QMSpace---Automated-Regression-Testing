import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the filter pop-up that appears the first time a
 * deliverable is selected on a product. The dialog lets the user either
 * configure and apply a filter to scope the deliverable's worksheet, or
 * skip past the filter step and load the worksheet unfiltered.
 *
 * The pop-up only appears on the first selection of each deliverable —
 * subsequent opens of the same deliverable jump straight to the
 * worksheet — so specs that drive deeper flows on a freshly-created
 * product should expect and dismiss this dialog explicitly.
 *
 * The skip path is implemented today. Filter-apply affordances (filter
 * controls + Apply button) live in this same POM and should be added
 * alongside [[skip]] when the corresponding test is written, so the
 * dialog's full surface stays in one place.
 */
export class DeliverableFilterDialog {
  readonly page: Page;

  /**
   * The dialog container. The pop-up is rendered as a MUI modal with
   * `role="dialog"`, so the standard role-based locator addresses it
   * unambiguously while no other dialog is open on the deliverables view.
   */
  readonly dialog: Locator;

  /**
   * Dismisses the dialog without applying a filter. Scoped to the dialog
   * so a stray same-named button elsewhere on the page can't be picked
   * instead.
   */
  readonly skipButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole('dialog');
    this.skipButton = this.dialog.getByRole('button', { name: 'Skip' });
  }

  /**
   * Asserts the filter dialog is open and ready for interaction. Uses a
   * generous timeout because the pop-up only mounts after the first
   * deliverable-load sequence settles, which is noticeably slower than
   * cached re-opens.
   */
  async expectVisible(): Promise<void> {
    await expect(this.skipButton).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Closes the dialog without applying any filter. After Skip the
   * deliverable's worksheet renders unfiltered. Waits for the Skip
   * button to leave the DOM as the canonical "dialog dismissed" signal
   * so downstream actions don't race the unmount.
   */
  async skip(): Promise<void> {
    await this.skipButton.click();
    await expect(this.skipButton).toBeHidden({ timeout: 15_000 });
  }

  /**
   * Best-effort dismissal for flows that open a deliverable without
   * caring whether the filter pop-up appears. The dialog is a one-shot
   * per user+deliverable — the server records the user's choice, so any
   * subsequent open within the same auth state jumps straight to the
   * worksheet and the dialog never mounts. Specs that drive the deeper
   * worksheet flows shouldn't fail when that happens.
   *
   * Waits up to `timeout` ms for the Skip button to appear; if it does,
   * clicks it and waits for the dialog to unmount. If it never appears
   * the method returns silently. Use a short timeout — the pop-up is
   * either there on first paint or not there at all, so we don't need to
   * absorb the full first-open settle budget.
   */
  async dismissIfPresent(timeout = 3_000): Promise<void> {
    try {
      await this.skipButton.waitFor({ state: 'visible', timeout });
    } catch {
      return;
    }
    await this.skip();
  }
}
