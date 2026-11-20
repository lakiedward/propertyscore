import { cva } from 'class-variance-authority';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type CalendarCellState = 'outside' | 'past' | 'closed' | 'full' | 'few' | 'open';

export type CalendarCell = {
  key: string;
  day: string;
  sub: string;
  label: string;
  state: CalendarCellState;
  isToday: boolean;
};

const cellVariants = cva(
  'flex min-h-13 flex-col items-center justify-center gap-0.75 rounded-lg px-0.5 py-1.5 tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-16',
  {
    variants: {
      state: {
        outside: 'border border-transparent',
        past: 'border border-transparent text-muted-foreground opacity-50',
        closed: 'border border-dashed border-border text-muted-foreground',
        full: 'border border-dashed border-border text-muted-foreground',
        few: 'cursor-pointer border border-border bg-slot-few hover:border-primary',
        open: 'cursor-pointer border border-border bg-step-leaf-soft hover:border-primary',
      },
      isSelected: {
        true: 'border-2 border-primary bg-primary text-primary-foreground hover:border-primary',
        false: '',
      },
      isToday: { true: 'border-2 border-category-green-fill', false: '' },
    },
    compoundVariants: [{ isSelected: true, isToday: true, className: 'border-primary' }],
  },
);

type MonthCalendarProps = {
  monthLabel: string;
  weekdays: readonly string[];
  weeks: readonly (readonly (CalendarCell | null)[])[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  isPreviousDisabled: boolean;
  isNextDisabled: boolean;
  onToday?: () => void;
  label: string;
};

export function MonthCalendar({
  monthLabel,
  weekdays,
  weeks,
  selectedKey,
  onSelect,
  onPrevious,
  onNext,
  isPreviousDisabled,
  isNextDisabled,
  onToday,
  label,
}: MonthCalendarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-2.5">
        <strong className="text-[18px] tracking-[-0.02em] first-letter:uppercase">
          {monthLabel}
        </strong>
        <div className="flex items-center gap-1.5">
          {onToday ? (
            <button
              type="button"
              onClick={onToday}
              className="h-10 rounded-md border border-border bg-card px-3 text-small font-bold text-brand"
            >
              {t('calendar.today')}
            </button>
          ) : null}
          <button
            type="button"
            aria-label={t('calendar.previous')}
            disabled={isPreviousDisabled}
            onClick={onPrevious}
            className="grid size-10 place-items-center rounded-full border border-border bg-card text-brand disabled:opacity-40"
          >
            <ChevronLeftIcon aria-hidden className="size-4.5" />
          </button>
          <button
            type="button"
            aria-label={t('calendar.next')}
            disabled={isNextDisabled}
            onClick={onNext}
            className="grid size-10 place-items-center rounded-full border border-border bg-card text-brand disabled:opacity-40"
          >
            <ChevronRightIcon aria-hidden className="size-4.5" />
          </button>
        </div>
      </div>
      <div role="grid" aria-label={label} className="flex flex-col gap-1.5">
        <div role="row" className="grid grid-cols-7 gap-1.5">
          {weekdays.map((weekday) => (
            <span
              key={weekday}
              role="columnheader"
              className="py-1 text-center text-meta font-bold tracking-[0.04em] text-muted-foreground uppercase"
            >
              {weekday}
            </span>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div
            key={week.find(Boolean)?.key ?? weekIndex}
            role="row"
            className="grid grid-cols-7 gap-1.5"
          >
            {week.map((cell, index) =>
              cell ? (
                <button
                  key={cell.key}
                  type="button"
                  role="gridcell"
                  aria-selected={selectedKey === cell.key}
                  aria-label={cell.label}
                  disabled={cell.state !== 'open' && cell.state !== 'few'}
                  onClick={() => {
                    onSelect(cell.key);
                  }}
                  className={cellVariants({
                    state: cell.state,
                    isSelected: selectedKey === cell.key,
                    isToday: cell.isToday && selectedKey !== cell.key,
                  })}
                >
                  <strong className="text-body leading-none font-extrabold sm:text-[19px]">
                    {cell.day}
                  </strong>
                  <span
                    className={
                      selectedKey === cell.key
                        ? 'text-micro font-bold whitespace-nowrap text-cta sm:text-[11px]'
                        : 'text-micro font-bold whitespace-nowrap text-muted-foreground sm:text-[11px]'
                    }
                  >
                    {cell.sub}
                  </span>
                </button>
              ) : (
                <span key={`empty-${String(index)}`} role="gridcell" aria-hidden />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
