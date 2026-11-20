import { screen } from '@testing-library/react';
import roCommon from '@/i18n/locales/ro/common.json';
import { renderWithProviders } from '@/test/render';
import { SignInPrompt } from './sign-in-prompt';

describe('SignInPrompt', () => {
  it('explains why to sign in and comes back to the same page after login', async () => {
    const { user } = await renderWithProviders(
      <SignInPrompt
        message="Intră în cont ca să salvezi locuința."
        trigger={<button type="button">Salvează</button>}
      />,
      { path: '/listings/abc?transaction=rent' },
    );

    expect(screen.queryByText('Intră în cont ca să salvezi locuința.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvează' }));

    expect(await screen.findByText('Intră în cont ca să salvezi locuința.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: roCommon.site.header.signIn })).toHaveAttribute(
      'href',
      `/login?redirect=${encodeURIComponent('/listings/abc?transaction=rent')}`,
    );
  });

  it('closes again with Escape', async () => {
    const { user } = await renderWithProviders(
      <SignInPrompt message="Mesaj" trigger={<button type="button">Salvează</button>} />,
    );

    await user.click(screen.getByRole('button', { name: 'Salvează' }));
    expect(await screen.findByText('Mesaj')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(screen.queryByText('Mesaj')).not.toBeInTheDocument();
  });
});
