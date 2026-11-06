import { screen, waitFor, within } from '@testing-library/react';
import roCommon from '@/i18n/locales/ro/common.json';
import { signedInAs, signedOut } from '@/test/factories/auth';
import { renderAppRoute } from '@/test/render';

const NAV = roCommon.panel.admin;

describe('AdminShell', { timeout: 20_000 }, () => {
  it('shows the admin sections to an admin', async () => {
    await renderAppRoute('/admin/users', { auth: signedInAs('admin') });

    const [sidebar] = await screen.findAllByRole('navigation', { name: NAV.navLabel });
    if (!sidebar) {
      throw new Error('The admin sidebar is missing');
    }
    expect(within(sidebar).getByText(NAV.groups.business)).toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: NAV.nav.users })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(sidebar).getAllByRole('link')).toHaveLength(12);
    expect(screen.getAllByText(roCommon.panel.userMenu.role.admin).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: roCommon.panel.backToSite })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('shows how many listings wait for review next to Anunțuri', async () => {
    await renderAppRoute('/admin', { auth: signedInAs('admin') });

    const [sidebar] = await screen.findAllByRole('navigation', { name: NAV.navLabel });
    if (!sidebar) {
      throw new Error('The admin sidebar is missing');
    }
    const pendingLabel = NAV.pendingListings_few.replace('{{count}}', '3');
    expect(
      await within(sidebar).findByRole(
        'link',
        { name: new RegExp(`^${NAV.nav.listings}\\s*${pendingLabel}$`) },
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
  });

  it('hides the admin panel from a regular user', async () => {
    await renderAppRoute('/admin', { auth: signedInAs() });

    expect(await screen.findByText(roCommon.pages.notFound.title)).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: NAV.navLabel })).not.toBeInTheDocument();
  });

  it('sends a signed-out visitor to sign in first', async () => {
    const { router } = await renderAppRoute('/admin/payments', { auth: signedOut });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
    expect(router.state.location.search).toEqual({ redirect: '/admin/payments' });
  });
});
