import { screen, within } from '@testing-library/react';
import roCommon from '@/i18n/locales/ro/common.json';
import { renderWithProviders } from '@/test/render';
import { SiteFooter } from './site-footer';

describe('SiteFooter', () => {
  it('opens the listings map from the homes links and the home sections from the others', async () => {
    await renderWithProviders(<SiteFooter />);

    const homes = screen.getByRole('navigation', { name: roCommon.site.footer.homes.title });
    expect(
      within(homes).getByRole('link', { name: roCommon.site.footer.homes.buy }),
    ).toHaveAttribute('href', '/listings?transaction=sale');
    expect(
      within(homes).getByRole('link', { name: roCommon.site.footer.homes.rent }),
    ).toHaveAttribute('href', '/listings?transaction=rent');
    expect(
      within(homes).getByRole('link', { name: roCommon.site.footer.homes.map }),
    ).toHaveAttribute('href', '/listings?transaction=sale');
    expect(
      within(homes).getByRole('link', { name: roCommon.site.footer.homes.publish }),
    ).toHaveAttribute('href', '/publish');

    const services = screen.getByRole('navigation', {
      name: roCommon.site.footer.services.title,
    });
    expect(
      within(services).getByRole('link', { name: roCommon.site.footer.services.pricing }),
    ).toHaveAttribute('href', '/#pricing');
  });
});
