import { screen } from '@testing-library/react';
import { FilterChip } from './filter-chip';
import { renderWithProviders } from '@/test/render';

describe('FilterChip', () => {
  it('reports the new selection when pressed', async () => {
    const onSelectedChange = vi.fn();
    const { user } = await renderWithProviders(
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
