import { cva } from 'class-variance-authority';
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
} from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDate } from '@/i18n/format';
import { cn } from '@/lib/utils';
import {
  fromDateKey,
  monthStartKey,
  monthWeeks,
  shiftDateKey,
  shiftMonthKey,
  toDateKey,
} from './date-picker.utils';

const ARROW_STEPS: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

const triggerVariants = cva(
  'flex min-w-0 items-center text-left tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
  {
    variants: {
      look: {
        field:
          'h-control w-full gap-2.5 rounded-md border border-border bg-card px-(--control-padding-x) text-(length:--control-font-size) hover:border-border-strong focus-visible:border-ring data-invalid:border-destructive data-invalid:ring-3 data-invalid:ring-destructive/20',
        title:
          'h-9 gap-1.5 rounded-md px-2 text-body-sm font-bold first-letter:uppercase hover:bg-accent [&>span]:first-letter:uppercase',
      },
      isClearable: { true: 'pr-9', false: '' },
    },
  },
);

const dayVariants = cva(
  'relative grid size-9 place-items-center rounded-md text-small tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-35',
  {
    variants: {
      isSelected: {
        true: 'bg-primary font-bold text-primary-foreground',
        false: 'hover:bg-accent hover:text-accent-foreground',
      },
      isOutside: { true: 'text-muted-foreground', false: '' },
      isToday: { true: 'font-bold text-brand ring-1 ring-border-strong', false: '' },
    },
    compoundVariants: [{ isSelected: true, isToday: true, className: 'text-primary-foreground' }],
  },
);

type DatePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  isInvalid?: boolean;
  look?: 'field' | 'title';
  label?: string;
  placeholder?: string;
  onClear?: () => void;
  clearLabel?: string;
  markedDays?: ReadonlySet<string>;
  className?: string;
};

export function DatePicker({
  id,
  value,
  onChange,
  min,
  isInvalid = false,
  look = 'field',
  label,
  placeholder,
  onClear,
  clearLabel,
  markedDays,
  className,
}: DatePickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [today] = useState(() => toDateKey(new Date()));
  const [focusedKey, setFocusedKey] = useState(value || today);
  const gridRef = useRef<HTMLDivElement>(null);
  const monthKey = monthStartKey(focusedKey);
  const weeks = monthWeeks(monthKey);
  const weekdays = (weeks[0] ?? []).map((key) =>
    formatDate(fromDateKey(key), { weekday: 'short' }).replace('.', ''),
  );
  const isBeforeMin = (key: string) => min !== undefined && key < min;

  const moveFocus = (key: string) => {
    setFocusedKey(key);
    requestAnimationFrame(() => {
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${key}"]`)?.focus();
    });
  };

  const choose = (key: string) => {
    onChange(key);
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, key: string) => {
    const step = ARROW_STEPS[event.key];
    if (step !== undefined) {
      event.preventDefault();
      moveFocus(shiftDateKey(key, step));
    }
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          setFocusedKey(value || today);
        }
      }}
    >
      <div className={cn('relative min-w-0', look === 'field' && 'w-full', className)}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            data-invalid={isInvalid || undefined}
            className={triggerVariants({ look, isClearable: Boolean(onClear && value) })}
          >
            {look === 'field' ? (
              <CalendarIcon aria-hidden className="size-4.5 shrink-0 text-brand" />
            ) : null}
            <span className={cn('truncate', !value && 'text-muted-foreground')}>
              {label ??
                (value
                  ? formatDate(fromDateKey(value), {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : (placeholder ?? t('calendar.choose')))}
            </span>
            {look === 'title' ? (
              <ChevronDownIcon aria-hidden className="size-4 shrink-0 text-brand" />
            ) : null}
          </button>
        </PopoverTrigger>
        {onClear && value ? (
          <button
            type="button"
            aria-label={clearLabel}
            onClick={onClear}
            className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
          >
            <XIcon aria-hidden className="size-4" />
          </button>
        ) : null}
      </div>
      <PopoverContent
        align="start"
        className="w-auto gap-3 p-3"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          moveFocus(value || today);
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <strong className="text-label first-letter:uppercase">
            {formatDate(fromDateKey(monthKey), { month: 'long', year: 'numeric' })}
          </strong>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={t('calendar.previous')}
              onClick={() => {
                setFocusedKey(shiftMonthKey(monthKey, -1));
              }}
              className="grid size-9 place-items-center rounded-full text-brand outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring"
            >
              <ChevronLeftIcon aria-hidden className="size-4.5" />
            </button>
            <button
              type="button"
              aria-label={t('calendar.next')}
              onClick={() => {
                setFocusedKey(shiftMonthKey(monthKey, 1));
              }}
              className="grid size-9 place-items-center rounded-full text-brand outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring"
            >
              <ChevronRightIcon aria-hidden className="size-4.5" />
            </button>
          </div>
        </div>
        <div
          ref={gridRef}
          role="grid"
          aria-label={formatDate(fromDateKey(monthKey), { month: 'long', year: 'numeric' })}
          className="flex flex-col gap-1"
        >
          <div role="row" className="grid grid-cols-7 gap-1">
            {weekdays.map((weekday) => (
              <span
                key={weekday}
                role="columnheader"
                className="grid h-7 place-items-center text-meta font-bold text-muted-foreground capitalize"
              >
                {weekday}
              </span>
            ))}
          </div>
          {weeks.map((week) => (
            <div key={week[0]} role="row" className="grid grid-cols-7 gap-1">
              {week.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  data-day={key}
                  tabIndex={key === focusedKey ? 0 : -1}
                  aria-selected={key === value}
                  aria-current={key === today ? 'date' : undefined}
                  aria-label={formatDate(fromDateKey(key), {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  disabled={isBeforeMin(key)}
                  onClick={() => {
                    choose(key);
                  }}
                  onKeyDown={(event) => {
                    handleKeyDown(event, key);
                  }}
                  className={dayVariants({
                    isSelected: key === value,
                    isOutside: !key.startsWith(monthKey.slice(0, 7)),
                    isToday: key === today,
                  })}
                >
                  {fromDateKey(key).getDate()}
                  {markedDays?.has(key) ? (
                    <span
                      aria-hidden
                      className={cn(
                        'absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full',
                        key === value ? 'bg-primary-foreground' : 'bg-primary',
                      )}
                    />
                  ) : null}
                </button>
              ))}
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={isBeforeMin(today)}
          onClick={() => {
            choose(today);
          }}
          className="self-start rounded-md px-2 py-1 text-small font-bold text-brand outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-40"
        >
          {t('calendar.today')}
        </button>
      </PopoverContent>
    </Popover>
  );
}
