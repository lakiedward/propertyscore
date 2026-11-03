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

  get userMenuButton(): Locator {
    return this.page.getByRole('banner').locator('button[aria-haspopup="menu"]:visible');
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

  async switchLanguage(to: keyof typeof COMMON_TEXT) {
    await this.userMenuButton.click();
    await this.page.getByRole('menuitem', { name: COMMON_TEXT[to].language[to] }).click();
  }

  async signOut() {
    await this.userMenuButton.click();
    await this.page.getByRole('menuitem', { name: this.text.panel.userMenu.signOut }).click();
  }
}
