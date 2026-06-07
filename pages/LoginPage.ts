import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the QMSpace sign-in screen.
 *
 * Locators prefer getByRole (accessible-name based) per Playwright best
 * practices. Where the application later exposes data-testid attributes,
 * those should replace the role-based locators below in this single place.
 */
export class LoginPage {
  static readonly URL = 'https://auto.qmsgpt.net/signin';

  readonly page: Page;
  readonly accountInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.accountInput = page.getByRole('textbox', { name: 'Account' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.signInButton = page.getByRole('button', { name: 'SIGN IN' });
  }

  async goto(): Promise<void> {
    await this.page.goto(LoginPage.URL);
  }

  async fillAccount(account: string): Promise<void> {
    await this.accountInput.fill(account);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.signInButton.click();
  }

  async signIn(account: string, password: string): Promise<void> {
    await this.fillAccount(account);
    await this.fillPassword(password);
    await this.submit();
  }

  /**
   * Asserts that the sign-in form is rendered and ready for input. Uses a
   * generous timeout because Webkit can take noticeably longer than the
   * other engines on the first paint of the sign-in page.
   */
  async expectLoaded(): Promise<void> {
    await expect(this.accountInput).toBeVisible({ timeout: 15_000 });
    await expect(this.passwordInput).toBeVisible({ timeout: 15_000 });
    await expect(this.signInButton).toBeEnabled({ timeout: 15_000 });
  }
}
