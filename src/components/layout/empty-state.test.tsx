import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('reports an empty result politely', async () => {
    await renderWithProviders(
      <EmptyState kind="empty" title="Niciun anunț" description="Încearcă alt filtru." />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Niciun anunț');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('announces an error as an alert', async () => {
    await renderWithProviders(<EmptyState kind="error" title="Nu am putut încărca" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Nu am putut încărca');
  });
});
