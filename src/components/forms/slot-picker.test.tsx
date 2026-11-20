import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { SlotPicker } from './slot-picker';

const DAYS = [
  { value: '2026-11-24', weekday: 'mar.', day: '24', month: 'nov.', label: 'marți, 24 noiembrie' },
  {
    value: '2026-11-25',
    weekday: 'mie.',
    day: '25',
    month: 'nov.',
    label: 'miercuri, 25 noiembrie',
    isDisabled: true,
  },
];

describe('SlotPicker', () => {
  it('reports the chosen day and time and blocks the unavailable ones', async () => {
    const onDayChange = vi.fn();
    const onTimeChange = vi.fn();
    const { user } = await renderWithProviders(
      <SlotPicker
        days={DAYS}
        times={[
          { value: '08:00', label: '08:00', isDisabled: true },
          { value: '09:30', label: '09:30' },
        ]}
        day="2026-11-24"
        time={null}
        onDayChange={onDayChange}
        onTimeChange={onTimeChange}
        dayLabel="Alege ziua"
        timeLabel="Alege ora"
        emptyText="Nicio oră liberă"
      />,
    );

    expect(screen.getByRole('radio', { name: 'marți, 24 noiembrie' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'miercuri, 25 noiembrie' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: '08:00' })).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: '09:30' }));

    expect(onTimeChange).toHaveBeenCalledWith('09:30');
    expect(onDayChange).not.toHaveBeenCalled();
  });

  it('shows the empty text when no time is free', async () => {
    await renderWithProviders(
      <SlotPicker
        days={DAYS}
        times={[{ value: '08:00', label: '08:00', isDisabled: true }]}
        day="2026-11-24"
        time={null}
        onDayChange={vi.fn()}
        onTimeChange={vi.fn()}
        dayLabel="Alege ziua"
        timeLabel="Alege ora"
        emptyText="Nicio oră liberă"
      />,
    );

    expect(screen.getByText('Nicio oră liberă')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: '08:00' })).not.toBeInTheDocument();
  });
});
