import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { PanelPageHeader } from './panel-page-header';

describe('PanelPageHeader', () => {
  it('shows the eyebrow, the page heading, the description and the actions', async () => {
    await renderWithProviders(
      <PanelPageHeader
        eyebrow="Moderare"
        title="Anunțuri"
        description="Verifică anunțurile trimise."
        actions={<button type="button">Adaugă</button>}
      />,
    );

    expect(screen.getByText('Moderare')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Anunțuri' })).toBeInTheDocument();
    expect(screen.getByText('Verifică anunțurile trimise.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adaugă' })).toBeInTheDocument();
  });

  it('shows only the heading when nothing else is given', async () => {
    await renderWithProviders(<PanelPageHeader title="Anunțurile mele" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Anunțurile mele' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });
});
