import { screen, within } from '@testing-library/react';
import roCommon from '@/i18n/locales/ro/common.json';
import { signedInAs } from '@/test/factories/auth';
import { renderAppRoute } from '@/test/render';

const NAV = roCommon.panel.account;

describe('AccountShell', { timeout: 20_000 }, () => {
  it('shows the account sections and marks the open one', async () => {
    await renderAppRoute('/account/reports', { auth: signedInAs() });

    const sidebar = await screen.findByRole('complementary', { name: NAV.navLabel });
    expect(within(sidebar).getByText(NAV.groups.activity)).toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: NAV.nav.reports })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(sidebar).getByRole('link', { name: NAV.nav.overview })).not.toHaveAttribute(
      'aria-current',
    );
    expect(within(sidebar).getAllByRole('link')).toHaveLength(10);
    expect(screen.getByText(`${NAV.label} / ${NAV.nav.reports}`)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: NAV.nav.reports })).toBeInTheDocument();
  });

  it('collapses the sidebar and remembers it', async () => {
    const { user } = await renderAppRoute('/account', { auth: signedInAs() });

    await user.click(await screen.findByRole('button', { name: NAV.closeMenu }));

    const sidebar = screen.getByRole('complementary', { name: NAV.navLabel });
    expect(within(sidebar).queryByText(NAV.groups.activity)).not.toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: NAV.nav.reports })).toHaveAttribute(
      'title',
      NAV.nav.reports,
    );
    expect(screen.getByRole('button', { name: NAV.openMenu })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(localStorage.getItem('ps-sb-closed')).toBe('1');
  });

  it('opens collapsed when the visitor collapsed it before', async () => {
    localStorage.setItem('ps-sb-closed', '1');

    await renderAppRoute('/account', { auth: signedInAs() });

    expect(await screen.findByRole('button', { name: NAV.openMenu })).toBeInTheDocument();
  });
});
