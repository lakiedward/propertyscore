import { screen, within } from '@testing-library/react';
import roCommon from '@/i18n/locales/ro/common.json';
import { SIDEBAR_COLLAPSED_STORAGE_KEY } from '@/hooks/use-sidebar-collapsed';
import { signedInAs } from '@/test/factories/auth';
import { buildProfile } from '@/test/factories/profile';
import { renderAppRoute } from '@/test/render';

const NAV = roCommon.panel.account;

function sidebarNav() {
  const [sidebar] = screen.getAllByRole('navigation', { name: NAV.navLabel });
  if (!sidebar) {
    throw new Error('The account sidebar is missing');
  }
  return sidebar;
}

describe('AccountShell', { timeout: 20_000 }, () => {
  it('shows the account sections and marks the open one', async () => {
    await renderAppRoute('/account/reports', { auth: signedInAs() });

    await screen.findAllByRole('navigation', { name: NAV.navLabel });
    const sidebar = sidebarNav();
    expect(within(sidebar).getByText(NAV.groups.activity)).toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: NAV.nav.reports })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(sidebar).getByRole('link', { name: NAV.nav.overview })).not.toHaveAttribute(
      'aria-current',
    );
    expect(within(sidebar).getAllByRole('link')).toHaveLength(9);
    expect(screen.getByText(`${NAV.label} / ${NAV.nav.reports}`)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: NAV.nav.reports })).toBeInTheDocument();
    expect(
      await screen.findAllByRole('button', { name: buildProfile().full_name ?? '' }),
    ).toHaveLength(1);
  });

  it('collapses the sidebar and remembers it', async () => {
    const { user } = await renderAppRoute('/account', { auth: signedInAs() });

    await user.click(await screen.findByRole('button', { name: roCommon.panel.collapseMenu }));

    const sidebar = sidebarNav();
    expect(within(sidebar).queryByText(NAV.groups.activity)).not.toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: NAV.nav.reports })).toHaveAttribute(
      'title',
      NAV.nav.reports,
    );
    expect(screen.getByRole('button', { name: roCommon.panel.expandMenu })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('1');
  });

  it('opens collapsed when the visitor collapsed it before', async () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, '1');

    await renderAppRoute('/account', { auth: signedInAs() });

    expect(
      await screen.findByRole('button', { name: roCommon.panel.expandMenu }),
    ).toBeInTheDocument();
  });
});
