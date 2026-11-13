import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterChip } from './filter-chip';

describe('FilterChip', () => {
  it('reports the new selection when pressed', async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    render(
      <FilterChip
        variant="reason"
        label="Anunț duplicat"
        isSelected={false}
        onSelectedChange={onSelectedChange}
      />,
    );

    const chip = screen.getByRole('button', { name: 'Anunț duplicat' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await user.click(chip);
    expect(onSelectedChange).toHaveBeenCalledWith(true);
  });
});
