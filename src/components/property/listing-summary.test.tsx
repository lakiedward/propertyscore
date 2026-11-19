import { screen, within } from '@testing-library/react';
import { BedDoubleIcon } from 'lucide-react';
import type { ListingSummaryContent } from '@/hooks/use-listing-summary';
import { renderWithProviders } from '@/test/render';
import { ListingSummary } from './listing-summary';

function summary(overrides: Partial<ListingSummaryContent> = {}): ListingSummaryContent {
  return {
    eyebrow: 'Apartament de vânzare · Timișoara',
    title: 'Apartament 3 camere, Complex',
    price: '168.000 €',
    area: '90 m²',
    facts: [{ key: 'rooms', icon: BedDoubleIcon, label: '3 camere' }],
    detailsHeading: 'Detalii',
    details: [{ key: 'heating', label: 'Încălzire', value: 'Centrală proprie' }],
    description: 'Apartament luminos.',
    photos: [],
    moreLabel: undefined,
    emptyLabel: 'Fără fotografii',
    ...overrides,
  };
}

describe('ListingSummary', () => {
  it('shows the title, the price, the facts, the details and the description', async () => {
    await renderWithProviders(<ListingSummary content={summary()} titleId="summary-title" />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Apartament 3 camere, Complex' }),
    ).toHaveAttribute('id', 'summary-title');
    expect(screen.getByText('168.000 €')).toBeInTheDocument();
    expect(screen.getByText('3 camere')).toBeInTheDocument();
    const details = screen.getByRole('region', { name: 'Detalii' });
    expect(within(details).getByText('Centrală proprie')).toBeInTheDocument();
    expect(screen.getByText('Apartament luminos.')).toBeInTheDocument();
  });

  it('leaves out the details and the description when there are none', async () => {
    await renderWithProviders(
      <ListingSummary content={summary({ details: [], description: null })} />,
    );

    expect(screen.queryByRole('region', { name: 'Detalii' })).not.toBeInTheDocument();
    expect(screen.queryByText('Apartament luminos.')).not.toBeInTheDocument();
  });
});
