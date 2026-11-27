import { exceptionFormSchema, weeklyHoursSchema } from './staff.schemas';

const EXCEPTION = {
  kind: 'day_off',
  fromDate: '2026-11-24',
  toDate: '2026-11-24',
  isAllDay: true,
  startTime: '08:00',
  endTime: '12:00',
  note: '',
} as const;

describe('staff.schemas', () => {
  it('accepts separate ranges and refuses overlapping or reversed ones', () => {
    expect(
      weeklyHoursSchema.safeParse({
        ranges: [
          { startsAt: '08:00', endsAt: '12:00' },
          { startsAt: '14:00', endsAt: '18:00' },
        ],
      }).success,
    ).toBe(true);
    expect(
      weeklyHoursSchema.safeParse({
        ranges: [
          { startsAt: '08:00', endsAt: '12:00' },
          { startsAt: '11:00', endsAt: '13:00' },
        ],
      }).success,
    ).toBe(false);
    expect(
      weeklyHoursSchema.safeParse({ ranges: [{ startsAt: '12:00', endsAt: '08:00' }] }).success,
    ).toBe(false);
  });

  it('allows at most four ranges a day', () => {
    const ranges = ['06:00', '09:00', '12:00', '15:00', '18:00'].map((startsAt, index) => ({
      startsAt,
      endsAt: `${String(7 + index * 3).padStart(2, '0')}:00`,
    }));

    expect(weeklyHoursSchema.safeParse({ ranges }).success).toBe(false);
  });

  it('checks the order of the exception dates and times', () => {
    expect(exceptionFormSchema.safeParse(EXCEPTION).success).toBe(true);
    expect(exceptionFormSchema.safeParse({ ...EXCEPTION, toDate: '2026-11-23' }).success).toBe(
      false,
    );
    expect(
      exceptionFormSchema.safeParse({
        ...EXCEPTION,
        isAllDay: false,
        startTime: '12:00',
        endTime: '08:00',
      }).success,
    ).toBe(false);
    expect(exceptionFormSchema.safeParse({ ...EXCEPTION, fromDate: '' }).success).toBe(false);
  });
});
