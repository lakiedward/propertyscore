import type { Locator, Page } from '@playwright/test';
import { AUTH_TEXT, COMMON_TEXT, type E2eLocale } from './texts';

export class AppShellPage {
  private readonly page: Page;
  private readonly text: (typeof COMMON_TEXT)[E2eLocale];
  private readonly authText: (typeof AUTH_TEXT)[E2eLocale];
  private readonly userName: string | undefined;

  constructor(page: Page, locale: E2eLocale, userName?: string) {
    this.page = page;
    this.text = COMMON_TEXT[locale];
    this.authText = AUTH_TEXT[locale];
    this.userName = userName;
  }

  get userMenuButton(): Locator {
    if (!this.userName) {
      throw new Error('AppShellPage needs the user name to find the user menu');
    }
    return this.page.getByRole('banner').getByRole('button', { name: this.userName });
  }

  get accountHeading(): Locator {
    return this.page.getByRole('heading', { name: this.text.panel.account.nav.overview });
  }

  get adminHeading(): Locator {
    return this.page.getByRole('heading', { name: this.text.panel.admin.nav.dashboard });
  }

  get document(): Locator {
    return this.page.locator('html');
  }

  async switchLanguage(to: E2eLocale) {
    await this.userMenuButton.click();
    await this.page.getByRole('menuitem', { name: COMMON_TEXT[to].language[to] }).click();
  }

  async signOut() {
    await this.userMenuButton.click();
    await this.page.getByRole('menuitem', { name: this.text.actions.signOut }).click();
    await this.page
      .getByRole('alertdialog', { name: this.authText.signOut.title })
      .getByRole('button', { name: this.authText.signOut.confirm })
      .click();
  }
}
