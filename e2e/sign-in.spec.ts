import { expect, test } from '@playwright/test';
import roAuth from '../src/i18n/locales/ro/auth.json' with { type: 'json' };
import { AppShellPage } from './pages/app-shell.page';
import { LoginPage } from './pages/login.page';
import { testUsers } from './test-users';

test.describe('Sign in', () => {
  test('signs in and lands on the account page', async ({ page }) => {
    const loginPage = new LoginPage(page, 'ro');
    await loginPage.goto();
    await loginPage.signIn(testUsers.ro.email, testUsers.ro.password);

    await expect(new AppShellPage(page, 'ro').accountHeading).toBeVisible();
  });

  test('rejects a wrong password with a translated message', async ({ page }) => {
    const loginPage = new LoginPage(page, 'ro');
    await loginPage.goto();
    await loginPage.signIn(testUsers.ro.email, 'not-the-password');

    await expect(page.getByText(roAuth.login.failedText)).toBeVisible();
  });

  test('sends a signed-out visitor to the login page and back after signing in', async ({
    page,
  }) => {
    await page.goto('/account');
    const loginPage = new LoginPage(page, 'ro');
    await expect(loginPage.heading).toBeVisible();

    await loginPage.signIn(testUsers.ro.email, testUsers.ro.password);

    await expect(page).toHaveURL(/\/account$/);
  });
});
