import { render, screen, within } from '@testing-library/react';
import { Stepper } from './stepper';

const STEPS = [
  { id: 'type', label: 'Tip' },
  { id: 'text', label: 'Titlu' },
  { id: 'details', label: 'Detalii' },
];

describe('Stepper', () => {
  it('lists every step and marks the current one', () => {
    render(<Stepper label="Pașii anunțului" steps={STEPS} current={2} />);

    const list = screen.getByRole('list', { name: 'Pașii anunțului' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).not.toHaveAttribute('aria-current');
  });
});
