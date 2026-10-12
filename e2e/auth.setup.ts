import { expect, test as setup } from '@playwright/test';
import { AppShellPage } from './pages/app-shell.page';
import { LoginPage } from './pages/login.page';
import { storageStatePath, testUsers, type TestUserName } from './test-users';

const USERS: TestUserName[] = ['ro', 'en', 'otherRo'];

for (const name of USERS) {
  setup(`sign in as the ${name} test user`, async ({ page }) => {
    const user = testUsers[name];
    const loginPage = new LoginPage(page, 'ro');
    await loginPage.goto();
    await loginPage.signIn(user.email, user.password);
    await expect(new AppShellPage(page, user.locale).signOutButton).toBeVisible();
    await page.context().storageState({ path: storageStatePath(name) });
  });
}
