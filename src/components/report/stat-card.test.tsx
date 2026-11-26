import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { StatCard } from './stat-card';

describe('StatCard', () => {
  it('shows the label, the value and the hint', async () => {
    await renderWithProviders(<StatCard label="Azi" value="3" hint="inspecții" tone="card" />);

    expect(await screen.findByText('Azi')).toBeInTheDocument();
    expect(screen.getByText('3')).toHaveClass('text-price-card');
    expect(screen.getByText('inspecții')).toBeInTheDocument();
  });

  it('leaves the hint out when there is none', async () => {
    await renderWithProviders(<StatCard label="Scor" value="72" />);

    expect(await screen.findByText('72')).toHaveClass('text-price');
    expect(screen.queryByText('inspecții')).not.toBeInTheDocument();
  });
});
