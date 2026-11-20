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

  it('runs its action', async () => {
    const onAction = vi.fn();
    const { user } = await renderWithProviders(
      <InlineToast tone="success" message="Alocat." action={{ label: 'Anulează', onAction }} />,
    );

    await user.click(screen.getByRole('button', { name: 'Anulează' }));

    expect(onAction).toHaveBeenCalled();
  });
});
