import { screen, waitFor, within } from '@testing-library/react';
import roCommon from '@/i18n/locales/ro/common.json';
import { signedInAs, signedOut } from '@/test/factories/auth';
import { renderAppRoute } from '@/test/render';

const NAV = roCommon.panel.admin;

describe('AdminShell', { timeout: 20_000 }, () => {
  it('shows the admin sections to an admin', async () => {
    await renderAppRoute('/admin/users', { auth: signedInAs('admin') });

    const sidebar = await screen.findByRole('complementary', { name: NAV.navLabel });
    expect(within(sidebar).getByText(NAV.groups.business)).toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: NAV.nav.users })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(sidebar).getAllByRole('link')).toHaveLength(13);
    expect(screen.getAllByText(roCommon.panel.userMenu.role.admin).length).toBeGreaterThan(0);
  });

  it('hides the admin panel from a regular user', async () => {
    await renderAppRoute('/admin', { auth: signedInAs() });

    expect(await screen.findByText(roCommon.pages.notFound.title)).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: NAV.navLabel })).not.toBeInTheDocument();
  });

  it('sends a signed-out visitor to sign in first', async () => {
    const { router } = await renderAppRoute('/admin/payments', { auth: signedOut });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
    expect(router.state.location.search).toEqual({ redirect: '/admin/payments' });
  });
});
