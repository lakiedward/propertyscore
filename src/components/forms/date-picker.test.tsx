import { screen } from '@testing-library/react';
import ro from '@/i18n/locales/ro/common.json';
import { renderWithProviders } from '@/test/render';
import { DatePicker } from './date-picker';

describe('DatePicker', () => {
  it('shows the chosen date and picks another day', async () => {
    const onChange = vi.fn();
    const { user } = await renderWithProviders(
      <DatePicker value="2026-11-23" onChange={onChange} />,
    );

    const trigger = screen.getByRole('button', { name: /23 nov\. 2026/ });
    await user.click(trigger);
    await user.click(await screen.findByRole('gridcell', { name: /25 noiembrie 2026/ }));

    expect(onChange).toHaveBeenCalledWith('2026-11-25');
  });

  it('moves to the next month and refuses days before the minimum', async () => {
    const { user } = await renderWithProviders(
      <DatePicker value="2026-11-23" min="2026-11-20" onChange={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /23 nov\. 2026/ }));
    expect(await screen.findByRole('gridcell', { name: /19 noiembrie 2026/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: ro.calendar.next }));

    expect(await screen.findByRole('grid', { name: /decembrie 2026/ })).toBeInTheDocument();
  });

  it('asks for a date when none is chosen', async () => {
    await renderWithProviders(<DatePicker value="" onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: ro.calendar.choose })).toBeInTheDocument();
  });

  it('clears the date and shows the placeholder when empty', async () => {
    const onClear = vi.fn();
    const { user } = await renderWithProviders(
      <DatePicker
        value="2026-11-23"
        onChange={vi.fn()}
        placeholder="Toate zilele"
        onClear={onClear}
        clearLabel="Arată toate zilele"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Arată toate zilele' }));

    expect(onClear).toHaveBeenCalled();
  });

  it('shows a custom label on the title trigger', async () => {
    await renderWithProviders(
      <DatePicker
        look="title"
        value="2026-11-22"
        label="Duminică, 22 nov. 2026"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Duminică, 22 nov. 2026' })).toBeInTheDocument();
  });
});
