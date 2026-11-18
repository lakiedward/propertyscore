import type { Page } from '@playwright/test';
import { AUTH_TEXT, type E2eLocale } from './texts';

export class SettingsPage {
  private readonly page: Page;
  private readonly text: (typeof AUTH_TEXT)[E2eLocale];

  constructor(page: Page, locale: E2eLocale = 'ro') {
    this.page = page;
    this.text = AUTH_TEXT[locale];
  }

  async goto() {
    await this.page.goto('/account/settings');
  }

  async deleteAccount(password: string) {
    await this.page.getByRole('button', { name: this.text.settings.delete.open }).click();
    const dialog = this.page.getByRole('alertdialog', {
      name: this.text.settings.delete.dialogTitle,
    });
    await dialog.getByLabel(this.text.settings.delete.password, { exact: true }).fill(password);
    await dialog.getByRole('button', { name: this.text.settings.delete.submit }).click();
  }
}
