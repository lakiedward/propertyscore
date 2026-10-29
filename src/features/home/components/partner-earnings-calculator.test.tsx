import { screen } from '@testing-library/react';
import roHome from '@/i18n/locales/ro/home.json';
import { renderWithProviders } from '@/test/render';
import { PartnerEarningsCalculator } from './partner-earnings-calculator';

const ANY_SPACE = /\s/g;

function amount(expected: string) {
  return (_content: string, element: Element | null) =>
    element?.tagName === 'SPAN' && element.textContent.replace(ANY_SPACE, ' ') === expected;
}

describe('PartnerEarningsCalculator', () => {
  it('starts at five properties a month', async () => {
    await renderWithProviders(<PartnerEarningsCalculator />);

    const slider = screen.getByRole('slider', { name: roHome.partners.calculator.label });
    expect(slider).toHaveAttribute('aria-valuenow', '5');
    expect(slider).toHaveAttribute('aria-valuetext', '5 proprietăți');
    expect(screen.getByText(amount('500 lei'))).toBeInTheDocument();
    expect(screen.getByText(amount('6.000 lei'))).toBeInTheDocument();
  });

  it('recalculates the earnings from the keyboard', async () => {
    const { user } = await renderWithProviders(<PartnerEarningsCalculator />);
    const slider = screen.getByRole('slider', { name: roHome.partners.calculator.label });

    slider.focus();
    await user.keyboard('{End}');

    expect(slider).toHaveAttribute('aria-valuetext', '20 de proprietăți');
    expect(screen.getByText(amount('2.000 lei'))).toBeInTheDocument();
    expect(screen.getByText(amount('24.000 lei'))).toBeInTheDocument();
  });
});
