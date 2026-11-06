import type { Locator, Page } from '@playwright/test';
import { AUTH_TEXT, type E2eLocale } from './texts';

export class SignUpPage {
  private readonly page: Page;
  private readonly text: (typeof AUTH_TEXT)[E2eLocale];

  constructor(page: Page, locale: E2eLocale = 'ro') {
    this.page = page;
    this.text = AUTH_TEXT[locale];
  }

  get checkEmailHeading(): Locator {
    return this.page.getByRole('heading', { name: this.text.confirmEmail.title });
  }

  async goto() {
    await this.page.goto('/sign-up');
  }

  async signUp(fullName: string, email: string, password: string, phone = '0722 123 456') {
    await this.page.getByLabel(this.text.fields.name.label, { exact: true }).fill(fullName);
    await this.page.getByLabel(this.text.fields.email.label, { exact: true }).fill(email);
    await this.page.getByLabel(this.text.fields.phone.label, { exact: true }).fill(phone);
    await this.page.getByLabel(this.text.fields.password.label, { exact: true }).fill(password);
    await this.page.getByRole('checkbox', { name: this.text.fields.terms.label }).check();
    await this.page.getByRole('button', { name: this.text.signUp.submit }).click();
  }
}
