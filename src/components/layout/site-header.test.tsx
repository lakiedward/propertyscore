import { screen, within } from '@testing-library/react';
import roCommon from '@/i18n/locales/ro/common.json';
import { renderWithProviders } from '@/test/render';
import { SiteHeader } from './site-header';

function renderHeader(isSignedIn = false) {
  return renderWithProviders(
    <SiteHeader isSignedIn={isSignedIn} languageSwitcher={null} menuLanguageSwitcher={null} />,
  );
}

describe('SiteHeader', () => {
  it('links every page section and the sign-in page', async () => {
    await renderHeader();

    const sections = screen.getByRole('navigation', { name: roCommon.site.sections.label });
    expect(
      within(sections).getByRole('link', { name: roCommon.site.sections.pricing }),
    ).toHaveAttribute('href', '/#pricing');
    expect(screen.getByRole('link', { name: roCommon.site.header.signIn })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('links the account page when signed in', async () => {
    await renderHeader(true);

    expect(screen.getByRole('link', { name: roCommon.site.header.account })).toHaveAttribute(
      'href',
      '/account',
    );
  });

  it('opens the menu and closes it with Escape, returning focus to the trigger', async () => {
    const { user } = await renderHeader();
    const trigger = screen.getByRole('button', { name: roCommon.site.header.openMenu });

    await user.click(trigger);
    const menu = await screen.findByRole('dialog', { name: roCommon.site.menu.label });
    expect(
      within(menu).getByRole('link', { name: roCommon.site.menu.forRent.all }),
    ).toHaveAttribute('href', '/?transaction=rent#listings');

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes the menu after following a link', async () => {
    const { user } = await renderHeader();

    await user.click(screen.getByRole('button', { name: roCommon.site.header.openMenu }));
    const menu = await screen.findByRole('dialog', { name: roCommon.site.menu.label });
    await user.click(within(menu).getByRole('link', { name: roCommon.site.menu.forSale.all }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
