import { getDefaultNormalizer, screen } from '@testing-library/react';
import { formatPrice } from '@/i18n/format';
import roCommon from '@/i18n/locales/ro/common.json';
import { renderWithProviders } from '@/test/render';
import { Price } from './price';

const normalize = getDefaultNormalizer();

describe('Price', () => {
  it('shows a sale price as it is', async () => {
    await renderWithProviders(<Price amount={125000} currency="EUR" />);

    expect(screen.getByText(normalize(formatPrice(125000, 'EUR')))).toBeInTheDocument();
  });

  it('adds the month to a rent', async () => {
    await renderWithProviders(<Price amount={450} currency="EUR" period="month" />);

    expect(
      screen.getByText(
        normalize(roCommon.price.perMonth.replace('{{price}}', formatPrice(450, 'EUR'))),
      ),
    ).toBeInTheDocument();
  });
});
