import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the Workitem Details view — the dedicated editing
 * surface opened from the worksheet's row context menu via "Details".
 * The details view surfaces the workitem's name plus its full set of
 * attribute fields as labelled inputs, giving the user a form-style
 * editor that complements the inline cell editing on the worksheet grid.
 *
 * The view loads read-only — an explicit "Edit" click switches it into
 * an editable state where the name and attribute fields accept input.
 * Save commits the changes and returns the view to read-only; Close
 * dismisses the view back to the worksheet.
 *
 * Attribute fields are addressed by their visible label (e.g.
 * "Indications for Use", "Patient Type") rather than by index — the
 * recorded test used `.nth()` / `[id=":rm6:"]` indices and dynamic MUI
 * `useId` outputs that drift between renders. `getByLabel` is the stable
 * surface the app exposes.
 */
export class WorkitemDetailsPage {
  readonly page: Page;
  readonly editButton: Locator;
  readonly saveButton: Locator;

  /**
   * The workitem name field. The details view renders the name as the
   * first plain textbox in document order (the description renders as a
   * Rich Text Editor with `role="application"`, not `textbox`, so it
   * doesn't shift this index). Kept as a stable second-textbox lookup
   * until the field exposes an accessible label.
   */
  readonly nameField: Locator;

  /**
   * Close-the-view button. After Save the view returns to read-only and
   * the third button in tab order is the close affordance. Matches the
   * recorded `getByRole('button').nth(2)`; swap for a named locator once
   * the close icon exposes an aria-label.
   */
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.editButton = page.getByRole('button', { name: 'Edit', exact: true });
    this.saveButton = page.getByRole('button', { name: 'Save', exact: true });
    // textbox.nth(1): the Description rich-text editor is a role="application",
    // not a textbox, so it doesn't sit between the (unnamed) header textbox at
    // index 0 and the workitem name at index 1.
    this.nameField = page.getByRole('textbox').nth(1);
    this.closeButton = page.getByRole('button').nth(2);
  }

  /**
   * Locator for the attribute input whose label matches `label`. The
   * form renders labels as plain text nodes in a sibling generic — not
   * as wired `<label for="">` elements and not via `aria-labelledby` —
   * so `getByLabel` has nothing to follow and the textbox has no
   * accessible name in the AX tree. Walk the DOM instead.
   *
   * Each form field is a wrapper element with exactly two child
   * elements: a label-row (text + optional "*" required marker) and
   * an input-row (the textbox). Match the wrapper whose FIRST child's
   * direct text-node child equals `label`, then descend into the
   * SECOND child's input. Anchoring on the wrapper shape excludes:
   * - the worksheet column header behind the side panel (same label
   *   text, but the matching wrapper's second child is a subtitle
   *   generic "(Intended Use )" with no input — XPath returns no
   *   result there),
   * - other fields with end-adorned MUI selects (e.g. the disabled
   *   Internal Source field), since their label text doesn't match.
   *
   * Swap back to `getByLabel` once the form exposes accessible names.
   */
  attributeField(label: string): Locator {
    const escaped = label.replace(/"/g, '\\"');
    return this.page.locator(
      `xpath=//*[./*[1]/text()[normalize-space()="${escaped}"]]/*[2]//input[not(@disabled)]`,
    );
  }

  /**
   * Asserts the details view is rendered and ready for interaction. The
   * Edit button is the canonical mount signal — present iff the view's
   * read-only state has finished hydrating.
   */
  async expectLoaded(): Promise<void> {
    await expect(this.editButton).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Switches the details view from read-only into editable state. Waits
   * for the Save button to mount so callers can't fire a field fill
   * before React binds the input handlers — without this, the first
   * `setName` / `setAttribute` can race the input mount and silently
   * land on a still-disabled control.
   */
  async enterEditMode(): Promise<void> {
    await this.editButton.click();
    await expect(this.saveButton).toBeVisible({ timeout: 10_000 });
  }

  /** Sets the workitem name. Requires [[enterEditMode]] first. */
  async setName(name: string): Promise<void> {
    await this.nameField.fill(name);
  }

  /**
   * Sets the attribute whose label matches `label` to `value`. Requires
   * [[enterEditMode]] first. The `label` argument must match the visible
   * label exactly — Intended Use Statement deliverables expose
   * "Indications for use", "Patient types", "User types", "Environments
   * of use", and "Use conditions" (lowercased and pluralised as shown,
   * matching the form's actual labels); other deliverables expose
   * different sets.
   */
  async setAttribute(label: string, value: string): Promise<void> {
    await this.attributeField(label).fill(value);
  }

  /**
   * Commits the pending edits. After Save the view returns to read-only
   * and the Edit button reappears — waiting for it is the canonical
   * "save committed" signal so callers can [[close]] without racing the
   * commit.
   */
  async save(): Promise<void> {
    await this.saveButton.click();
    await expect(this.editButton).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Dismisses the details view back to the worksheet. Should be called
   * after [[save]] — closing while the view is in edit mode discards
   * pending changes.
   */
  async close(): Promise<void> {
    await this.closeButton.click();
  }
}
