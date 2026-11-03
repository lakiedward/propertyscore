import { screen } from '@testing-library/react';
import { formatPrice } from '@/i18n/format';
import roCommon from '@/i18n/locales/ro/common.json';
import { renderWithProviders } from '@/test/render';
import { Price } from './price';

const ANY_SPACE = /\s/g;

function normalised(text: string) {
  return text.replace(ANY_SPACE, ' ');
}

describe('Price', () => {
  it('shows a sale price as it is', async () => {
    await renderWithProviders(<Price amount={125000} currency="EUR" />);

    expect(screen.getByText(normalised(formatPrice(125000, 'EUR')))).toBeInTheDocument();
  });

  it('adds the month to a rent', async () => {
    await renderWithProviders(<Price amount={450} currency="EUR" period="month" />);

    expect(
      screen.getByText(
        normalised(roCommon.price.perMonth.replace('{{price}}', formatPrice(450, 'EUR'))),
      ),
    ).toBeInTheDocument();
  });
});
