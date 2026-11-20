import { screen, within } from '@testing-library/react';
import roCommon from '@/i18n/locales/ro/common.json';
import { renderWithProviders } from '@/test/render';
import { Breadcrumbs } from './breadcrumbs';

const NAV = roCommon.panel.account;

describe('Breadcrumbs', () => {
  it('links the earlier steps and marks the current page', async () => {
    await renderWithProviders(
      <Breadcrumbs
        items={[
          { id: 'account', label: NAV.label, to: '/account' },
          { id: 'favorites', label: NAV.nav.favorites },
        ]}
      />,
    );

    const trail = screen.getByRole('navigation', { name: roCommon.breadcrumbs.label });
    expect(within(trail).getByRole('link', { name: NAV.label })).toHaveAttribute(
      'href',
      '/account',
    );
    expect(within(trail).getByText(NAV.nav.favorites)).toHaveAttribute('aria-current', 'page');
    expect(within(trail).queryByRole('link', { name: NAV.nav.favorites })).not.toBeInTheDocument();
  });
});
