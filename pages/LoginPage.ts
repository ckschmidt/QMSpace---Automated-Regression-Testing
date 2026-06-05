import type { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly username_textbox: Locator;
  readonly password_textbox: Locator;
  readonly login_button: Locator;

  constructor(page: Page) {
    this.page = page;
    this.username_textbox = this.page.getByRole('textbox', { name: 'Account' });
    this.password_textbox = this.page.getByRole('textbox', { name: 'Password' });
    this.login_button = this.page.getByRole('button', { name: 'SIGN IN' });
  }

  async gotoLoginPage() {
    await this.page.goto('https://auto.qmsgpt.net/signin');
  }

  async login(username: string, password: string) {
    await this.username_textbox.fill(username);
    await this.password_textbox.fill(password);
    await this.login_button.click();
  }
}