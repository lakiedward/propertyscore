import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { PanelPageHeader } from './panel-page-header';

describe('PanelPageHeader', () => {
  it('shows the description and the actions without a second page title', async () => {
    await renderWithProviders(
      <PanelPageHeader
        description="Verifică anunțurile trimise."
        actions={<button type="button">Adaugă</button>}
      />,
    );

    expect(screen.getByText('Verifică anunțurile trimise.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adaugă' })).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('renders nothing when there is nothing to show', async () => {
    await renderWithProviders(<PanelPageHeader />);

    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
