import { screen, waitFor, within } from '@testing-library/react';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';
import enHome from '@/i18n/locales/en/home.json';
import roCommon from '@/i18n/locales/ro/common.json';
import roHome from '@/i18n/locales/ro/home.json';
import roListings from '@/i18n/locales/ro/listings.json';
import roSmartCheck from '@/i18n/locales/ro/smartCheck.json';
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

  it('starts Smart Check from the home page without signing in', async () => {
    const { user } = await renderAppRoute('/');
    const hero = await screen.findByRole('group', { name: roHome.hero.servicesLabel });
    const heroAction = within(hero).getByRole('link', {
      name: new RegExp(roHome.hero.smartCheck.action),
    });
    const main = within(screen.getByRole('main'));
    const { amount, currency } = SERVICE_PRICES.smartCheck;
    const price = formatPrice(amount, currency);
    const footer = within(screen.getByRole('contentinfo'));

    const priceActions = main.getAllByRole('link', { name: roHome.smartCheck.price.cta });
    expect(priceActions).toHaveLength(2);
    for (const action of [
      heroAction,
      ...priceActions,
      main.getByRole('link', {
        name: roHome.smartCheck.steps.cta.replace('{{price}}', price),
      }),
      footer.getByRole('link', { name: roCommon.site.footer.smartCheckCta }),
      footer.getByRole('link', {
        name: roCommon.site.footer.services.smartCheck.replace('{{price}}', price),
      }),
    ]) {
      expect(action).toHaveAttribute('href', '/check');
    }
    expect(main.getByRole('link', { name: roHome.smartCheck.price.example })).toHaveAttribute(
      'href',
      '/?deliverable=zone#deliverables',
    );

    await user.click(heroAction);

    expect(
      await screen.findByRole('heading', { name: roSmartCheck.check.heading.address.title }),
    ).toBeInTheDocument();
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
