import { useId } from 'react';
import { cn } from '@/lib/utils';

type SlotPickerDay = {
  value: string;
  weekday: string;
  day: string;
  month: string;
  label: string;
  isDisabled?: boolean;
};

type SlotPickerTime = {
  value: string;
  label: string;
  isDisabled?: boolean;
};

type SlotPickerProps = {
  days: readonly SlotPickerDay[];
  times: readonly SlotPickerTime[];
  day: string | null;
  time: string | null;
  onDayChange: (day: string) => void;
  onTimeChange: (time: string) => void;
  dayLabel: string;
  timeLabel: string;
  emptyText: string;
  className?: string;
};

const SLOT_CLASS =
  'flex min-h-touch cursor-pointer flex-col items-center gap-0.5 rounded-md border-[1.5px] border-border bg-card px-2 py-2.5 text-foreground tabular-nums transition-colors duration-(--duration-fast) outline-none hover:border-border-strong focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 aria-checked:border-primary aria-checked:bg-primary aria-checked:text-primary-foreground disabled:cursor-not-allowed disabled:border-dashed disabled:bg-surface-sunken disabled:text-disabled-foreground disabled:line-through';

export function SlotPicker({
  days,
  times,
  day,
  time,
  onDayChange,
  onTimeChange,
  dayLabel,
  timeLabel,
  emptyText,
  className,
}: SlotPickerProps) {
  const dayLabelId = useId();
  const timeLabelId = useId();
  const hasFreeTime = times.some((option) => !option.isDisabled);

  return (
    <div className={cn('flex flex-col gap-4.5', className)}>
      <div className="flex flex-col gap-2">
        <span id={dayLabelId} className="text-label">
          {dayLabel}
        </span>
        <div
          role="radiogroup"
          aria-labelledby={dayLabelId}
          className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2"
        >
          {days.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={day === option.value}
              aria-label={option.label}
              disabled={option.isDisabled}
              onClick={() => {
                onDayChange(option.value);
              }}
              className={SLOT_CLASS}
            >
              <span className="text-meta font-bold tracking-[0.05em] uppercase opacity-80">
                {option.weekday}
              </span>
              <span className="text-[20px] leading-[1.1] font-extrabold">{option.day}</span>
              <span className="text-meta">{option.month}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span id={timeLabelId} className="text-label">
          {timeLabel}
        </span>
        {hasFreeTime ? (
          <div
            role="radiogroup"
            aria-labelledby={timeLabelId}
            className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2"
          >
            {times.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={time === option.value}
                disabled={option.isDisabled}
                onClick={() => {
                  onTimeChange(option.value);
                }}
                className={SLOT_CLASS}
              >
                <span className="text-body font-bold">{option.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-caption text-muted-foreground">{emptyText}</p>
        )}
      </div>
    </div>
  );
}
