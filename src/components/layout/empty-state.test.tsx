import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('reports an empty result politely', async () => {
    await renderWithProviders(
      <EmptyState title="Niciun anunț" description="Încearcă alt filtru." />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Niciun anunț');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('announces an error as an alert', async () => {
    await renderWithProviders(<EmptyState kind="error" title="Nu am putut încărca" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Nu am putut încărca');
  });

  it('shows the action under the text', async () => {
    await renderWithProviders(
      <EmptyState
        title="Nicio locuință salvată"
        action={<button type="button">Vezi locuințe</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Vezi locuințe' })).toBeInTheDocument();
  });
});
