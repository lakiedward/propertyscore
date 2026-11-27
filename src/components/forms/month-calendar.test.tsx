import { screen } from '@testing-library/react';
import ro from '@/i18n/locales/ro/common.json';
import { renderWithProviders } from '@/test/render';
import { MonthCalendar } from './month-calendar';

const CELLS = [
  {
    key: '2026-11-21',
    day: '21',
    sub: '2 libere',
    label: 'sâmbătă, 2 ore libere',
    state: 'few',
    isToday: false,
  },
  {
    key: '2026-11-22',
    day: '22',
    sub: 'închis',
    label: 'duminică, indisponibil',
    state: 'closed',
    isToday: false,
  },
] as const;

describe('MonthCalendar', () => {
  it('lets only days with free hours be chosen and moves between months', async () => {
    const onSelect = vi.fn();
    const onNext = vi.fn();
    const { user } = await renderWithProviders(
      <MonthCalendar
        label="Calendar"
        monthLabel="noiembrie 2026"
        weekdays={['L', 'M', 'M', 'J', 'V', 'S', 'D']}
        weeks={[[null, null, null, null, null, CELLS[0], CELLS[1]]]}
        selectedKey={null}
        onSelect={onSelect}
        onPrevious={vi.fn()}
        onNext={onNext}
        isPreviousDisabled
        isNextDisabled={false}
      />,
    );

    expect(screen.getByRole('gridcell', { name: 'duminică, indisponibil' })).toBeDisabled();
    await user.click(screen.getByRole('gridcell', { name: 'sâmbătă, 2 ore libere' }));
    expect(onSelect).toHaveBeenCalledWith('2026-11-21');
    expect(screen.getByRole('button', { name: ro.calendar.previous })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: ro.calendar.next }));
    expect(onNext).toHaveBeenCalled();
  });
});
