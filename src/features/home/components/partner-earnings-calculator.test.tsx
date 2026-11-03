import { screen } from '@testing-library/react';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';
import roHome from '@/i18n/locales/ro/home.json';
import { renderWithProviders } from '@/test/render';
import { PartnerEarningsCalculator } from './partner-earnings-calculator';

const ANY_SPACE = /\s/g;
const calculator = roHome.partners.calculator;
const { amount: commission, currency } = SERVICE_PRICES.partnerCommission;

function normalised(text: string) {
  return text.replace(ANY_SPACE, ' ');
}

function price(value: number) {
  const expected = normalised(formatPrice(value, currency));
  return (_content: string, element: Element | null) =>
    element?.tagName === 'SPAN' && normalised(element.textContent) === expected;
}

describe('PartnerEarningsCalculator', () => {
  it('starts at five properties a month', async () => {
    await renderWithProviders(<PartnerEarningsCalculator />);

    const slider = screen.getByRole('slider', { name: calculator.label });
    expect(slider).toHaveAttribute('aria-valuenow', '5');
    expect(slider).toHaveAttribute(
      'aria-valuetext',
      calculator.value_few.replace('{{count}}', '5'),
    );
    expect(screen.getByText(price(5 * commission))).toBeInTheDocument();
    expect(screen.getByText(price(5 * commission * 12))).toBeInTheDocument();
  });

  it('recalculates the earnings from the keyboard', async () => {
    const { user } = await renderWithProviders(<PartnerEarningsCalculator />);
    const slider = screen.getByRole('slider', { name: calculator.label });

    await user.tab();
    expect(slider).toHaveFocus();
    await user.keyboard('{End}');

    expect(slider).toHaveAttribute(
      'aria-valuetext',
      calculator.value_other.replace('{{count}}', '20'),
    );
    expect(screen.getByText(price(20 * commission))).toBeInTheDocument();
    expect(screen.getByText(price(20 * commission * 12))).toBeInTheDocument();
  });
});
