import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { DashboardPanel } from './dashboard-panel';

describe('DashboardPanel', () => {
  it('names its section by the title and renders the subtitle and actions', async () => {
    await renderWithProviders(
      <DashboardPanel
        title="Excepții"
        subtitle="Concedii"
        actions={<button type="button">Adaugă</button>}
      >
        <p>Conținut</p>
      </DashboardPanel>,
    );

    expect(screen.getByRole('region', { name: 'Excepții' })).toHaveTextContent('Conținut');
    expect(screen.getByText('Concedii')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adaugă' })).toBeInTheDocument();
  });
});
