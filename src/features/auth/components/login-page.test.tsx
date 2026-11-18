import { screen } from '@testing-library/react';
import roAuth from '@/i18n/locales/ro/auth.json';
import { renderAppRoute } from '@/test/render';

function noAccountAction(): string {
  return roAuth.login.noAccount.replace(/^.*<action>(.*)<\/action>.*$/, '$1');
}

describe('LoginPage', { timeout: 20_000 }, () => {
  it('links to account creation with the words inside the link, keeping the redirect', async () => {
    await renderAppRoute('/login?redirect=%2Fpublish');

    const link = await screen.findByRole('link', { name: noAccountAction() });
    expect(link).toHaveAttribute('href', '/sign-up?redirect=%2Fpublish');
  });
});
