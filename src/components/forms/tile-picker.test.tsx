import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { TilePicker } from './tile-picker';

const LEGEND = 'Tip locuință';
const OPTIONS = [
  { value: 'apartment', content: 'Apartament' },
  { value: 'house', content: 'Casă' },
  { value: 'land', content: 'Teren', isDisabled: true },
] as const;

async function renderPicker(value: 'apartment' | 'house' | 'land' | null, onChange = vi.fn()) {
  const { user } = await renderWithProviders(
    <TilePicker value={value} options={OPTIONS} onChange={onChange} legend={LEGEND} />,
  );
  return { user, onChange };
}

describe('TilePicker', () => {
  it('names the group by its legend and marks the chosen tile', async () => {
    await renderPicker('house');

    expect(await screen.findByRole('radiogroup', { name: LEGEND })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Casă' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Apartament' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('radio', { name: 'Teren' })).toBeDisabled();
  });

  it('chooses a tile by click and keeps it when clicked again', async () => {
    const { user, onChange } = await renderPicker('apartment');

    await user.click(await screen.findByRole('radio', { name: 'Casă' }));
    expect(onChange).toHaveBeenLastCalledWith('house');

    await user.click(screen.getByRole('radio', { name: 'Apartament' }));
    expect(onChange).toHaveBeenLastCalledWith('apartment');
  });

  it('moves between tiles with the arrow keys', async () => {
    const { user } = await renderPicker('apartment');

    await user.tab();
    expect(await screen.findByRole('radio', { name: 'Apartament' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Casă' })).toHaveFocus();
  });
});
