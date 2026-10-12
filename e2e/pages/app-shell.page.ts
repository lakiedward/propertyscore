import type { Locator, Page } from '@playwright/test';
import enCommon from '../../src/i18n/locales/en/common.json' with { type: 'json' };
import roCommon from '../../src/i18n/locales/ro/common.json' with { type: 'json' };

const COMMON_TEXT = { ro: roCommon, en: enCommon } as const;

export class AppShellPage {
  private readonly page: Page;
  private readonly text: (typeof COMMON_TEXT)[keyof typeof COMMON_TEXT];

  constructor(page: Page, locale: keyof typeof COMMON_TEXT) {
    this.page = page;
    this.text = COMMON_TEXT[locale];
  }

  get signOutButton(): Locator {
    return this.page.getByRole('button', { name: this.text.actions.signOut });
  }

  get homeHeading(): Locator {
    return this.page.getByRole('heading', { name: this.text.home.title });
  }

  async switchLanguage(to: keyof typeof COMMON_TEXT) {
    await this.page.getByRole('button', { name: this.text.language.label }).click();
    await this.page.getByRole('menuitemradio', { name: COMMON_TEXT[to].language[to] }).click();
  }
}
