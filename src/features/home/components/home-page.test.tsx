import { screen, waitFor, within } from '@testing-library/react';
import enHome from '@/i18n/locales/en/home.json';
import roCommon from '@/i18n/locales/ro/common.json';
import roHome from '@/i18n/locales/ro/home.json';
import roListings from '@/i18n/locales/ro/listings.json';
import { renderAppRoute } from '@/test/render';

vi.mock('@/components/map/map-canvas', () => import('@/test/mocks/map-canvas'));

function heading(level: number, lead: string) {
  return screen.getByRole('heading', { level, name: new RegExp(lead) });
}

describe('HomePage', { timeout: 20_000 }, () => {
  it('renders every section of the home page in Romanian', async () => {
    await renderAppRoute('/');

    expect(
      await screen.findByRole('heading', { level: 1, name: new RegExp(roHome.hero.titleLead) }),
    ).toBeInTheDocument();
    for (const lead of [
      roHome.smartCheck.titleLead,
      roHome.physical.titleLead,
      roHome.deliverables.titleLead,
      roHome.listings.titleLead,
      roHome.partners.titleLead,
      roHome.pricing.titleLead,
      roHome.faq.titleLead,
    ]) {
      expect(heading(2, lead)).toBeInTheDocument();
    }
  });

  it('renders the page in English', async () => {
    await renderAppRoute('/', { locale: 'en' });

    expect(
      await screen.findByRole('heading', { level: 1, name: new RegExp(enHome.hero.titleLead) }),
    ).toBeInTheDocument();
    expect(heading(2, enHome.pricing.titleLead)).toBeInTheDocument();
  });

  it('opens the deliverable named in the address', async () => {
    await renderAppRoute('/?deliverable=zone');

    const tabs = await screen.findByRole('tablist', { name: roHome.deliverables.tabsLabel });
    expect(
      within(tabs).getByRole('tab', { name: new RegExp(roCommon.brand.smartcheck) }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('heading', { name: new RegExp(roHome.deliverables.zone.titleLead) }),
    ).toBeInTheDocument();
  });

  it('falls back to the first deliverable when the address names an unknown one', async () => {
    await renderAppRoute('/?deliverable=unknown');

    const tabs = await screen.findByRole('tablist', { name: roHome.deliverables.tabsLabel });
    expect(
      within(tabs).getByRole('tab', { name: new RegExp(roCommon.brand.physical) }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('opens the rentals named in the address', async () => {
    await renderAppRoute('/?transaction=rent');

    const rent = await screen.findByRole('radio', { name: roListings.transaction.rent });
    expect(rent).toHaveAttribute('aria-checked', 'true');
  });

  it('writes the chosen transaction into the address', async () => {
    const { user, router } = await renderAppRoute('/');

    await user.click(await screen.findByRole('radio', { name: roListings.transaction.rent }));

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ transaction: 'rent' });
    });
  });
});
