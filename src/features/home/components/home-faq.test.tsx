import { screen } from '@testing-library/react';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';
import roCommon from '@/i18n/locales/ro/common.json';
import roHome from '@/i18n/locales/ro/home.json';
import { renderWithProviders } from '@/test/render';
import { HomeFaq } from './home-faq';

const [difference, price] = roHome.faq.items;

function fill(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{{${name}}}`, value),
    template,
  );
}

describe('HomeFaq', () => {
  it('fills the brand names and the prices into the questions', async () => {
    await renderWithProviders(<HomeFaq />);
    const values = {
      physical: roCommon.brand.physical,
      smartCheck: roCommon.brand.smartcheck,
      physicalPrice: formatPrice(SERVICE_PRICES.physical.amount, SERVICE_PRICES.physical.currency),
      smartCheckPrice: formatPrice(
        SERVICE_PRICES.smartCheck.amount,
        SERVICE_PRICES.smartCheck.currency,
      ),
    };

    expect(
      screen.getByRole('button', { name: fill(difference?.q ?? '', values) }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: fill(price?.q ?? '', values) })).toBeInTheDocument();
  });
});
