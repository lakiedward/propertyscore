import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { Stepper } from './stepper';

describe('Stepper', () => {
  it('marks the current step and shows every label', async () => {
    await renderWithProviders(<Stepper label="Pași" steps={['Unu', 'Doi', 'Trei']} current={1} />);

    const items = screen.getAllByRole('listitem');
    expect(screen.getByRole('list', { name: 'Pași' })).toBeInTheDocument();
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).not.toHaveAttribute('aria-current');
    expect(screen.getByText('Trei')).toBeInTheDocument();
  });
});
