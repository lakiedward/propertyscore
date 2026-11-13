import { screen, within } from '@testing-library/react';
import roCommon from '@/i18n/locales/ro/common.json';
import { renderWithProviders } from '@/test/render';
import { SiteHeader, type SiteHeaderAccount } from './site-header';

function renderHeader(account?: SiteHeaderAccount, path = '/') {
  return renderWithProviders(<SiteHeader account={account} menuLanguageSwitcher={null} />, {
    path,
  });
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

  it('links the sections of the publish page in the header and in the menu for small screens', async () => {
    const { user } = await renderHeader(undefined, '/publish');

    const sections = screen.getByRole('navigation', { name: roCommon.site.sections.label });
    expect(
      within(sections).getByRole('link', { name: roCommon.site.publishSections.steps }),
    ).toHaveAttribute('href', '/publish#steps');
    expect(
      within(sections).queryByRole('link', { name: roCommon.site.sections.pricing }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: roCommon.site.header.openMenu }));
    const menu = await screen.findByRole('dialog', { name: roCommon.site.menu.label });
    expect(
      within(menu).getByRole('heading', { name: roCommon.site.menu.onThisPage }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole('link', { name: roCommon.site.publishSections.verified }),
    ).toHaveAttribute('href', '/publish#verified');
    const pricingLinks = within(menu).getAllByRole('link', {
      name: roCommon.site.menu.services.pricing,
    });
    expect(pricingLinks).toHaveLength(1);
    expect(pricingLinks[0]).toHaveAttribute('href', '/#pricing');
  });

  it('puts the header buttons in the menu for small screens', async () => {
    const { user } = await renderHeader(undefined, '/listings');

    await user.click(screen.getByRole('button', { name: roCommon.site.header.openMenu }));
    const menu = await screen.findByRole('dialog', { name: roCommon.site.menu.label });
    expect(within(menu).getByRole('link', { name: roCommon.site.header.physical })).toHaveAttribute(
      'href',
      '/#physical',
    );
    expect(
      within(menu).getByRole('link', { name: roCommon.site.header.smartCheck }),
    ).toHaveAttribute('href', '/#smart-check');
    expect(
      within(menu).getAllByRole('link', { name: roCommon.site.header.publish })[0],
    ).toHaveAttribute('href', '/publish');
    expect(
      within(menu).queryByRole('heading', { name: roCommon.site.menu.onThisPage }),
    ).not.toBeInTheDocument();
  });

  it('hides the section links on pages without sections', async () => {
    await renderHeader(undefined, '/listings');

    expect(
      screen.queryByRole('navigation', { name: roCommon.site.sections.label }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: roCommon.site.header.signIn })).toBeInTheDocument();
  });

  it('shows the account menu instead of the sign-in link when signed in', async () => {
    const { user } = await renderHeader({
      path: '/admin',
      menu: <button type="button">AM</button>,
    });

    expect(screen.getByRole('button', { name: 'AM' })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: roCommon.site.header.signIn }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: roCommon.site.header.openMenu }));
    const menu = await screen.findByRole('dialog', { name: roCommon.site.menu.label });
    expect(within(menu).getByRole('link', { name: roCommon.panel.link.admin })).toHaveAttribute(
      'href',
      '/admin',
    );
  });

  it('opens the menu and closes it with Escape, returning focus to the trigger', async () => {
    const { user } = await renderHeader();
    const trigger = screen.getByRole('button', { name: roCommon.site.header.openMenu });

    await user.click(trigger);
    const menu = await screen.findByRole('dialog', { name: roCommon.site.menu.label });
    expect(
      within(menu).getByRole('link', { name: roCommon.site.menu.forRent.all }),
    ).toHaveAttribute('href', '/listings?transaction=rent');

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
