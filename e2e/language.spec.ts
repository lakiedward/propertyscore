import { expect, test } from '@playwright/test';
import { AppShellPage } from './pages/app-shell.page';
import { storageStatePath } from './test-users';

test.describe('Language for a Romanian user', () => {
  test.use({ storageState: storageStatePath('otherRo') });

  test('shows Romanian and keeps an English choice after a reload', async ({ page }) => {
    await page.goto('/');
    await expect(new AppShellPage(page, 'ro').homeHeading).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro');

    await new AppShellPage(page, 'ro').switchLanguage('en');
    await expect(new AppShellPage(page, 'en').homeHeading).toBeVisible();

    await page.reload();
    await expect(new AppShellPage(page, 'en').homeHeading).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await new AppShellPage(page, 'en').switchLanguage('ro');
    await expect(new AppShellPage(page, 'ro').homeHeading).toBeVisible();
  });
});

test.describe('Language for an English user', () => {
  test.use({ storageState: storageStatePath('en') });

  test('shows English from the profile', async ({ page }) => {
    await page.goto('/');

    await expect(new AppShellPage(page, 'en').homeHeading).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
