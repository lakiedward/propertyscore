import { expect, test } from '@playwright/test';
import { emailLinkFor } from './mailpit';
import { AppShellPage } from './pages/app-shell.page';
import { SignUpPage } from './pages/sign-up.page';

const RUN_ID = `${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}`;

test.describe('Sign up', () => {
  test('creates an account, confirms the email and opens the account page', async ({
    page,
    request,
  }) => {
    const email = `e2e-${RUN_ID}@example.test`;
    const signUpPage = new SignUpPage(page, 'ro');
    await signUpPage.goto();
    await signUpPage.signUp(`E2E-${RUN_ID}`, email, 'Parola-E2E-2026');

    await expect(signUpPage.checkEmailHeading).toBeVisible();

    await page.goto(await emailLinkFor(request, email));

    await expect(new AppShellPage(page, 'ro').accountHeading).toBeAttached();
  });
});
