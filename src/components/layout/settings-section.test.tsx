import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { SettingsSection } from './settings-section';

describe('SettingsSection', () => {
  it('names the section after its title and shows its content', async () => {
    await renderWithProviders(
      <SettingsSection title="Telefon" description="Numărul la care te putem contacta.">
        <button type="button">Salvează</button>
      </SettingsSection>,
    );

    const section = screen.getByRole('region', { name: 'Telefon' });
    expect(section).toHaveTextContent('Numărul la care te putem contacta.');
    expect(screen.getByRole('heading', { level: 2, name: 'Telefon' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvează' })).toBeInTheDocument();
  });
});
