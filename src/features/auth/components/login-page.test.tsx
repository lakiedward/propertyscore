import { screen } from '@testing-library/react';
import { renderAppRoute } from '@/test/render';

describe('LoginPage', { timeout: 20_000 }, () => {
  it('links to account creation with the words inside the link, keeping the redirect', async () => {
    await renderAppRoute('/login?redirect=%2Fpublish');

    const link = await screen.findByRole('link', { name: 'Creează cont nou.' });
    expect(link).toHaveAttribute('href', '/sign-up?redirect=%2Fpublish');
  });
});
