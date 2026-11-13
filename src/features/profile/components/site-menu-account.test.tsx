import { screen, waitFor, within } from '@testing-library/react';
import { SiteHeader } from '@/components/layout/site-header';
import roAuth from '@/i18n/locales/ro/auth.json';
import roCommon from '@/i18n/locales/ro/common.json';
import { signedInAs } from '@/test/factories/auth';
import { buildProfile } from '@/test/factories/profile';
import { renderWithProviders } from '@/test/render';
import { SiteMenuAccount } from './site-menu-account';

const auth = signedInAs();
const profileName = buildProfile().full_name ?? '';
const email = auth.user?.email ?? '';

async function openSiteMenu() {
  const { user } = await renderWithProviders(
    auth.user ? (
      <SiteHeader
        account={{
          path: '/account',
          menu: null,
          menuSection: <SiteMenuAccount user={auth.user} panelPath="/account" />,
        }}
        menuLanguageSwitcher={null}
      />
    ) : null,
    { auth },
  );
  await user.click(screen.getByRole('button', { name: roCommon.site.header.openMenu }));
  const menu = await screen.findByRole('dialog', { name: roCommon.site.menu.label });
  return { user, menu };
}

describe('SiteMenuAccount', { timeout: 20_000 }, () => {
  it('shows the account with its panel and settings in the site menu', async () => {
    const { menu } = await openSiteMenu();

    expect(await within(menu).findByText(profileName)).toBeInTheDocument();
    expect(within(menu).getByText(email)).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: roCommon.panel.link.account })).toHaveAttribute(
      'href',
      '/account',
    );
    expect(
      within(menu).getByRole('link', { name: roCommon.panel.account.nav.settings }),
    ).toHaveAttribute('href', '/account/settings');
    expect(
      within(menu).queryByRole('link', { name: roCommon.site.header.signIn }),
    ).not.toBeInTheDocument();
  });

  it('asks before signing out', async () => {
    const { user, menu } = await openSiteMenu();

    await user.click(within(menu).getByRole('button', { name: roCommon.actions.signOut }));
    const dialog = await screen.findByRole('alertdialog', { name: roAuth.signOut.title });
    await user.click(within(dialog).getByRole('button', { name: roAuth.signOut.confirm }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });
});
