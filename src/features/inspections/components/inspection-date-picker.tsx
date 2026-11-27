import { cva } from 'class-variance-authority';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheckIcon, SunIcon, SunriseIcon, SunsetIcon, ZapIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MonthCalendar, type CalendarCell } from '@/components/forms/month-calendar';
import { TilePicker } from '@/components/forms/tile-picker';
import { EmptyState } from '@/components/layout/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { inspectionQueries } from '../api/inspections.queries';
import { bucharestDay } from '@/lib/bucharest-time';
import { fromDateKey, monthStartKey, shiftMonthKey } from '@/lib/date-keys';
import {
  availabilityByDay,
  bookingWindow,
  dayState,
  firstFreeSlot,
  monthDays,
  partOfDay,
  visitEnd,
  type PartOfDay,
} from '../slots.utils';

const PARTS = [
  { key: 'morning', icon: SunriseIcon },
  { key: 'midday', icon: SunIcon },
  { key: 'afternoon', icon: SunsetIcon },
] as const satisfies readonly { key: PartOfDay; icon: typeof SunIcon }[];

const FEW_FREE = 2;

const slotVariants = cva(
  'flex min-h-14 flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2',
  {
    variants: {
      state: {
        selected: 'border-2 border-primary bg-primary text-primary-foreground',
        free: 'border border-border bg-card hover:border-primary',
        busy: 'border border-dashed border-border text-muted-foreground',
      },
    },
  },
);

const TIME = { hour: '2-digit', minute: '2-digit' } as const;

type InspectionDatePickerProps = {
  cityId: string;
  cityName: string;
  startsAt: string | null;
  isStartTaken: boolean;
  onPick: (startsAt: string | null) => void;
};

export function InspectionDatePicker({
  cityId,
  cityName,
  startsAt,
  isStartTaken,
  onPick: pickStart,
}: InspectionDatePickerProps) {
  const { t } = useTranslation('inspections');
  const [now] = useState(() => new Date());
  const { first, last } = bookingWindow(now);
  const slots = useQuery(inspectionQueries.slots(cityId, first, last));
  const [month, setMonth] = useState(() =>
    monthStartKey(startsAt ? bucharestDay(new Date(startsAt)) : first),
  );
  const [pickedDay, setPickedDay] = useState<string | null>(() =>
    startsAt ? bucharestDay(new Date(startsAt)) : null,
  );

  if (slots.isPending) {
    return <Skeleton className="h-150 rounded-photo" />;
  }
  if (slots.isError) {
    return <EmptyState kind="error" title={t('booking.date.error')} />;
  }

  const byDay = availabilityByDay(slots.data);
  const firstFree = firstFreeSlot(slots.data);
  const today = bucharestDay(now);
  const selectedDay = pickedDay ? byDay.get(pickedDay) : undefined;
  const freeCount = selectedDay?.starts.filter((slot) => slot.free > 0).length ?? 0;

  const pickDay = (key: string) => {
    setPickedDay(key);
    if (startsAt && bucharestDay(new Date(startsAt)) !== key) {
      pickStart(null);
    }
  };

  const weeks = monthDays(month).map((week) =>
    week.map((key): CalendarCell | null => {
      if (!key) {
        return null;
      }
      const date = fromDateKey(key);
      const availability = byDay.get(key);
      const state = dayState(key, availability, now);
      const free = availability?.free ?? 0;
      const label = formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
      return {
        key,
        day: String(date.getDate()),
        isToday: key === today,
        state: state === 'open' && free <= FEW_FREE ? 'few' : state,
        sub:
          state === 'open'
            ? t('booking.date.freeShort', { count: free })
            : state === 'full'
              ? t('booking.date.full')
              : state === 'closed'
                ? t('booking.date.closed')
                : '',
        label:
          state === 'open'
            ? t('booking.date.dayFree', { day: label, count: free })
            : state === 'past' || state === 'outside'
              ? t('booking.date.dayPast', { day: label })
              : t('booking.date.dayOff', { day: label }),
      };
    }),
  );

  if (!firstFree) {
    return (
      <EmptyState
        title={t('booking.date.noSlots.title')}
        description={t('booking.date.noSlots.text', { city: cityName })}
      />
    );
  }

  return (
    <>
      {isStartTaken ? (
        <Alert tone="warning">
          <AlertTitle>{t('booking.date.taken.title')}</AlertTitle>
          <AlertDescription>{t('booking.date.taken.text')}</AlertDescription>
        </Alert>
      ) : null}
      <div className="overflow-hidden rounded-photo border border-card bg-card shadow-card-soft">
        <div className="flex flex-col gap-3.5 p-4.5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <StepNumber number={1} isActive />
              <strong className="text-title-3xs">{t('booking.date.dayTitle')}</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                const day = bucharestDay(new Date(firstFree.starts_at));
                setMonth(monthStartKey(day));
                setPickedDay(day);
                pickStart(firstFree.starts_at);
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border-[1.5px] border-category-green-fill bg-step-leaf-soft px-3.5 text-small font-bold text-step-leaf-ink hover:bg-step-leaf-surface"
            >
              <ZapIcon aria-hidden className="size-4" />
              {t('booking.date.firstFree', {
                when: formatDate(firstFree.starts_at, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  ...TIME,
                }),
              })}
            </button>
          </div>
          <MonthCalendar
            label={t('booking.date.calendarLabel')}
            monthLabel={formatDate(fromDateKey(month), { month: 'long', year: 'numeric' })}
            weekdays={Array.from({ length: 7 }, (_, index) =>
              formatDate(new Date(2024, 0, index + 1), { weekday: 'short' }),
            )}
            weeks={weeks}
            selectedKey={pickedDay}
            onSelect={pickDay}
            onPrevious={() => {
              setMonth(shiftMonthKey(month, -1));
            }}
            onNext={() => {
              setMonth(shiftMonthKey(month, 1));
            }}
            isPreviousDisabled={month <= monthStartKey(first)}
            isNextDisabled={month >= monthStartKey(last)}
            onToday={
              month === monthStartKey(first)
                ? undefined
                : () => {
                    setMonth(monthStartKey(first));
                  }
            }
          />
        </div>
        <div
          className={cn(
            'flex flex-col gap-3.5 border-t border-border-subtle p-4.5 sm:p-6',
            pickedDay ? 'bg-card' : 'bg-background',
          )}
        >
          <div className="flex items-center gap-3">
            <StepNumber number={2} isActive={pickedDay !== null} />
            <div className="flex flex-col">
              <strong className="text-title-3xs">{t('booking.date.timeTitle')}</strong>
              <span className="text-small text-muted-foreground first-letter:uppercase">
                {pickedDay
                  ? t('booking.date.timeHelp', {
                      day: formatDate(fromDateKey(pickedDay), {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'short',
                      }),
                      count: freeCount,
                    })
                  : t('booking.date.timeHelpEmpty')}
              </span>
            </div>
          </div>
          {selectedDay ? (
            <div className="flex flex-col gap-3.5">
              {PARTS.map(({ key, icon: Icon }) => {
                const partSlots = selectedDay.starts.filter(
                  (slot) => partOfDay(new Date(slot.starts_at)) === key,
                );
                if (partSlots.length === 0) {
                  return null;
                }
                return (
                  <TilePicker
                    key={key}
                    value={startsAt}
                    onChange={pickStart}
                    legend={
                      <>
                        <Icon aria-hidden className="size-4" />
                        {t(`booking.date.parts.${key}`)}
                      </>
                    }
                    fieldSetClassName="gap-2"
                    legendClassName="mb-2 inline-flex items-center gap-2 font-bold text-muted-foreground data-[variant=legend]:text-caption"
                    className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2"
                    options={partSlots.map((slot) => {
                      const isFree = slot.free > 0;
                      const isSelected = startsAt === slot.starts_at;
                      return {
                        value: slot.starts_at,
                        isDisabled: !isFree,
                        className: slotVariants({
                          state: isSelected ? 'selected' : isFree ? 'free' : 'busy',
                        }),
                        content: (
                          <>
                            <strong
                              className={cn(
                                'text-title-3xs tabular-nums',
                                !isFree && 'line-through',
                              )}
                            >
                              {formatDate(slot.starts_at, TIME)}
                            </strong>
                            <span
                              className={cn(
                                'text-meta',
                                isSelected ? 'text-cta' : 'text-muted-foreground',
                              )}
                            >
                              {isFree
                                ? t('booking.date.until', {
                                    time: formatDate(visitEnd(slot.starts_at), TIME),
                                  })
                                : t('booking.date.busy')}
                            </span>
                          </>
                        ),
                      };
                    })}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
        {startsAt ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 bg-primary px-3.5 py-3.5 text-primary-foreground sm:px-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cta text-cta-foreground">
              <CalendarCheckIcon aria-hidden className="size-5" />
            </span>
            <div className="flex flex-[1_1_200px] flex-col">
              <strong className="text-body first-letter:uppercase">
                {t('booking.date.picked', {
                  day: formatDate(startsAt, { weekday: 'long', day: 'numeric', month: 'short' }),
                  from: formatDate(startsAt, TIME),
                  to: formatDate(visitEnd(startsAt), TIME),
                })}
              </strong>
              <span className="text-caption text-on-photo-faint">
                {t('booking.date.pickedNote')}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

type StepNumberProps = {
  number: number;
  isActive: boolean;
};

function StepNumber({ number, isActive }: StepNumberProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-7 shrink-0 place-items-center rounded-full text-caption font-extrabold',
        isActive ? 'bg-primary text-cta' : 'bg-border text-muted-foreground',
      )}
    >
      {number}
    </span>
  );
}
