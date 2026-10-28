import { screen, within } from '@testing-library/react';
import enHome from '@/i18n/locales/en/home.json';
import roHome from '@/i18n/locales/ro/home.json';
import { renderAppRoute } from '@/test/render';

vi.mock('@/components/map/map-canvas', () => ({
  MapCanvas: ({ label }: { label: string }) => <div role="region" aria-label={label} />,
}));

describe('HomePage', { timeout: 20_000 }, () => {
  it('renders every section of the home page in Romanian', async () => {
    await renderAppRoute('/');

    expect(
      await screen.findByRole('heading', { level: 1, name: /Cunoaște locuința/ }),
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
      expect(screen.getByRole('heading', { level: 2, name: new RegExp(lead) })).toBeInTheDocument();
    }
  });

  it('renders the page in English', async () => {
    await renderAppRoute('/', { locale: 'en' });

    expect(
      await screen.findByRole('heading', { level: 1, name: /Know the home/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: new RegExp(enHome.pricing.titleLead) }),
    ).toBeInTheDocument();
  });

  it('opens the deliverable named in the address', async () => {
    await renderAppRoute('/?deliverable=zone');

    const tabs = await screen.findByRole('tablist', { name: roHome.deliverables.tabsLabel });
    expect(within(tabs).getByRole('tab', { name: /Smart Check/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getByRole('heading', { name: new RegExp(roHome.deliverables.zone.titleLead) }),
    ).toBeInTheDocument();
  });
});
