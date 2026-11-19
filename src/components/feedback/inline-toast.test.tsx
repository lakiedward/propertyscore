import { screen } from '@testing-library/react';
import { InlineToast } from './inline-toast';
import { renderWithProviders } from '@/test/render';

describe('InlineToast', () => {
  it('announces a success politely', async () => {
    await renderWithProviders(<InlineToast tone="success" message="Anunțul a fost aprobat." />);

    expect(screen.getByRole('status')).toHaveTextContent('Anunțul a fost aprobat.');
  });

  it('announces an error as an alert', async () => {
    await renderWithProviders(<InlineToast tone="error" message="Nu am putut salva decizia." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Nu am putut salva decizia.');
  });
});
