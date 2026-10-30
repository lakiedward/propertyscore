import type { Locator, Page } from '@playwright/test';
import enAuth from '../../src/i18n/locales/en/auth.json' with { type: 'json' };
import roAuth from '../../src/i18n/locales/ro/auth.json' with { type: 'json' };

const AUTH_TEXT = { ro: roAuth, en: enAuth } as const;

export class LoginPage {
  private readonly page: Page;
  private readonly text: (typeof AUTH_TEXT)[keyof typeof AUTH_TEXT];

  constructor(page: Page, locale: keyof typeof AUTH_TEXT = 'ro') {
    this.page = page;
    this.text = AUTH_TEXT[locale];
  }

  get heading(): Locator {
    return this.page.getByRole('heading', {
      name: `${this.text.login.headBold} ${this.text.login.headRest}`,
    });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async signIn(email: string, password: string) {
    await this.page.getByLabel(this.text.fields.email.label, { exact: true }).fill(email);
    await this.page.getByLabel(this.text.fields.password.label, { exact: true }).fill(password);
    await this.page.getByRole('button', { name: this.text.login.submit }).click();
  }
}
