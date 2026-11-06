import { expect, test } from '@playwright/test';
import { emailLinkFor } from './mailpit';
import { AppShellPage } from './pages/app-shell.page';
import { SettingsPage } from './pages/settings.page';
import { SignUpPage } from './pages/sign-up.page';

const RUN_ID = `${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}`;
const PASSWORD = 'Parola-E2E-2026';

test.describe('Sign up', () => {
  test('creates an account, confirms the email, opens the account page and deletes it', async ({
    page,
    request,
  }) => {
    const email = `e2e-${RUN_ID}@example.test`;
    const signUpPage = new SignUpPage(page, 'ro');
    await signUpPage.goto();
    await signUpPage.signUp(`E2E-${RUN_ID}`, email, PASSWORD);

    await expect(signUpPage.checkEmailHeading).toBeVisible();

    await page.goto(await emailLinkFor(request, email));

    await expect(page).toHaveURL(/\/account$/);
    await expect(new AppShellPage(page, 'ro').accountHeading).toBeAttached();

    const settingsPage = new SettingsPage(page, 'ro');
    await settingsPage.goto();
    await settingsPage.deleteAccount(PASSWORD);

    await expect(page).toHaveURL(/\/$/);
  });
});
