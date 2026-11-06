import type { Locator, Page } from '@playwright/test';
import { AUTH_TEXT, type E2eLocale } from './texts';

function withoutTags(text: string): string {
  return text.replace(/<\/?[a-z]+>/g, '');
}

export class LoginPage {
  private readonly page: Page;
  private readonly text: (typeof AUTH_TEXT)[E2eLocale];

  constructor(page: Page, locale: E2eLocale = 'ro') {
    this.page = page;
    this.text = AUTH_TEXT[locale];
  }

  get heading(): Locator {
    return this.page.getByRole('heading', { name: withoutTags(this.text.login.heading) });
  }

  get failedMessage(): Locator {
    return this.page.getByText(this.text.login.failedText);
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
