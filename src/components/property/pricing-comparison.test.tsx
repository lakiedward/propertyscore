import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { PricingComparison } from './pricing-comparison';

const VALUE_LABELS = { yes: 'Inclus', no: 'Nu este inclus', partial: 'Parțial' } as const;

describe('PricingComparison', () => {
  it('announces the value of every cell before its text', async () => {
    await renderWithProviders(
      <PricingComparison
        caption="Comparație servicii"
        featureHeader="Ce primești"
        columns={[
          { key: 'physical', header: 'Property Fizic', tone: 'physical' },
          { key: 'online', header: 'Smart Check', tone: 'online' },
        ]}
        rows={[
          {
            key: 'visit',
            label: 'Vizită la fața locului',
            cells: [
              { value: 'yes', text: 'Inspector la locuință' },
              { value: 'no', text: 'Doar date online' },
            ],
          },
          {
            key: 'zone',
            label: 'Analiza zonei',
            cells: [
              { value: 'partial', text: 'Pe scurt' },
              { value: 'yes', text: 'Completă' },
            ],
          },
        ]}
        valueLabels={VALUE_LABELS}
      />,
    );

    const table = screen.getByRole('table', { name: 'Comparație servicii' });
    const visit = within(table).getByRole('row', { name: /Vizită la fața locului/ });
    expect(
      within(visit)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual([
      'Property FizicInclus: Inspector la locuință',
      'Smart CheckNu este inclus: Doar date online',
    ]);
    const zone = within(table).getByRole('row', { name: /Analiza zonei/ });
    expect(within(zone).getByText(`${VALUE_LABELS.partial}:`)).toHaveClass('sr-only');
  });
});
