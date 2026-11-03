import type { Locator, Page } from '@playwright/test';
import enAuth from '../../src/i18n/locales/en/auth.json' with { type: 'json' };
import roAuth from '../../src/i18n/locales/ro/auth.json' with { type: 'json' };

const AUTH_TEXT = { ro: roAuth, en: enAuth } as const;

export class SignUpPage {
  private readonly page: Page;
  private readonly text: (typeof AUTH_TEXT)[keyof typeof AUTH_TEXT];

  constructor(page: Page, locale: keyof typeof AUTH_TEXT = 'ro') {
    this.page = page;
    this.text = AUTH_TEXT[locale];
  }

  get checkEmailHeading(): Locator {
    return this.page.getByRole('heading', { name: this.text.confirmEmail.title });
  }

  async goto() {
    await this.page.goto('/sign-up');
  }

  async signUp(fullName: string, email: string, password: string) {
    await this.page.getByLabel(this.text.fields.name.label, { exact: true }).fill(fullName);
    await this.page.getByLabel(this.text.fields.email.label, { exact: true }).fill(email);
    await this.page.getByLabel(this.text.fields.password.label, { exact: true }).fill(password);
    await this.page.getByRole('checkbox', { name: this.text.fields.terms.label }).check();
    await this.page.getByRole('button', { name: this.text.signUp.submit }).click();
  }
}
