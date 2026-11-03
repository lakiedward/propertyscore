export type MonthValue = { month: string; value: number };

function presentMonths(
  months: readonly string[],
  values: readonly (number | null)[],
): MonthValue[] {
  return months.flatMap((month, index) => {
    const value = values[index];
    return value === null || value === undefined ? [] : [{ month, value }];
  });
}

export function extremeMonths(
  months: readonly string[],
  values: readonly (number | null)[],
): { highest: MonthValue | undefined; lowest: MonthValue | undefined } {
  const present = presentMonths(months, values);
  const sorted = [...present].sort((left, right) => right.value - left.value);
  return { highest: sorted[0], lowest: sorted[sorted.length - 1] };
}

export function monthDate(month: string): Date {
  return new Date(`${month}-01T12:00:00Z`);
}
