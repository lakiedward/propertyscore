import { useQuery } from '@tanstack/react-query';
import {
  CalendarXIcon,
  ClockIcon,
  PalmtreeIcon,
  PencilIcon,
  PlaneIcon,
  PlusIcon,
  Trash2Icon,
  type LucideIcon,
} from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { DashboardPanel } from '@/components/report/dashboard-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { formatDate } from '@/i18n/format';
import { bucharestDay, bucharestInstant, bucharestTime } from '@/lib/bucharest-time';
import { fromDateKey } from '@/lib/date-keys';
import { staffQueries, useRemoveException, useSetWeeklyHours } from '../api/staff.queries';
import { WEEKDAYS, type InspectorExceptionKind, type TimeRange } from '../staff.types';
import { weeklyRangesByDay } from '../staff.utils';
import { ExceptionDialog } from './exception-dialog';
import { WeeklyHoursDialog } from './weekly-hours-dialog';

const DEFAULT_RANGES: readonly TimeRange[] = [{ startsAt: '08:00', endsAt: '17:00' }];

const EXCEPTION_ICON = {
  day_off: PalmtreeIcon,
  leave: PlaneIcon,
  training: ClockIcon,
  other: CalendarXIcon,
} as const satisfies Record<InspectorExceptionKind, LucideIcon>;

type AvailabilityEditorProps = {
  inspectorId: string;
  description: ReactNode;
};

export function AvailabilityEditor({ inspectorId, description }: AvailabilityEditorProps) {
  const { t } = useTranslation('staff');
  const [now] = useState(() => new Date());
  const todayKey = bucharestDay(now);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <DashboardPanel title={t('availability.weekly.title')} subtitle={description}>
        <WeeklyHours inspectorId={inspectorId} />
      </DashboardPanel>
      <Exceptions inspectorId={inspectorId} todayKey={todayKey} />
    </div>
  );
}

function weekdayName(weekday: number): string {
  return formatDate(new Date(2024, 0, weekday), { weekday: 'long' });
}

type WeeklyHoursProps = {
  inspectorId: string;
};

function WeeklyHours({ inspectorId }: WeeklyHoursProps) {
  const { t } = useTranslation('staff');
  const hours = useQuery(staffQueries.weeklyHours(inspectorId));
  const setWeeklyHours = useSetWeeklyHours();
  const [editedDay, setEditedDay] = useState<number | null>(null);

  if (hours.isPending) {
    return (
      <div className="flex flex-col gap-2">
        {WEEKDAYS.map((weekday) => (
          <Skeleton key={weekday} className="h-11" />
        ))}
      </div>
    );
  }

  if (hours.isError && !hours.data) {
    return <EmptyState kind="error" title={t('availability.weekly.error')} />;
  }

  const byDay = weeklyRangesByDay(hours.data);

  return (
    <div className="flex flex-col">
      {WEEKDAYS.map((weekday) => {
        const ranges = byDay.get(weekday) ?? [];
        const isWorking = ranges.length > 0;
        const dayName = weekdayName(weekday);
        const isSaving = setWeeklyHours.isPending && setWeeklyHours.variables.weekday === weekday;
        return (
          <WeekdayRow
            key={weekday}
            dayName={dayName}
            ranges={ranges}
            isWorking={isWorking}
            isSaving={isSaving}
            onToggle={(isOn) => {
              setWeeklyHours.mutate({
                inspectorId,
                weekday,
                ranges: isOn ? DEFAULT_RANGES : [],
              });
            }}
            onEdit={() => {
              setEditedDay(weekday);
            }}
            editLabel={t('availability.weekly.edit', { day: dayName })}
          />
        );
      })}
      {editedDay === null ? null : (
        <WeeklyHoursDialog
          inspectorId={inspectorId}
          weekday={editedDay}
          dayName={weekdayName(editedDay)}
          ranges={byDay.get(editedDay) ?? []}
          isOpen
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setEditedDay(null);
            }
          }}
        />
      )}
    </div>
  );
}

type WeekdayRowProps = {
  dayName: string;
  ranges: readonly TimeRange[];
  isWorking: boolean;
  isSaving: boolean;
  onToggle: (isOn: boolean) => void;
  onEdit: () => void;
  editLabel: string;
};

function WeekdayRow({
  dayName,
  ranges,
  isWorking,
  isSaving,
  onToggle,
  onEdit,
  editLabel,
}: WeekdayRowProps) {
  const { t } = useTranslation('staff');
  const switchId = useId();

  return (
    <div className="grid min-h-13 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-t border-border-subtle py-2 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
      <div className="flex items-center gap-3">
        <Switch id={switchId} checked={isWorking} disabled={isSaving} onCheckedChange={onToggle} />
        <label htmlFor={switchId} className="text-label first-letter:uppercase">
          {dayName}
        </label>
      </div>
      <span className="col-span-2 row-start-2 flex flex-wrap gap-1.5 sm:col-span-1 sm:row-start-auto">
        {isWorking ? (
          ranges.map((range) => (
            <span
              key={range.startsAt}
              className="inline-flex min-h-8 items-center rounded-md bg-step-leaf-surface px-3 text-small font-bold text-step-leaf-ink tabular-nums"
            >
              {t('availability.weekly.range', { from: range.startsAt, to: range.endsAt })}
            </span>
          ))
        ) : (
          <span className="inline-flex min-h-8 items-center rounded-md bg-background px-3 text-small font-bold text-muted-foreground">
            {t('availability.weekly.off')}
          </span>
        )}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="touch-target col-start-2 row-start-1 sm:col-start-3"
        disabled={!isWorking}
        aria-label={editLabel}
        onClick={onEdit}
      >
        <PencilIcon aria-hidden />
        {t('availability.weekly.editShort')}
      </Button>
    </div>
  );
}

type ExceptionsProps = {
  inspectorId: string;
  todayKey: string;
};

function Exceptions({ inspectorId, todayKey }: ExceptionsProps) {
  const { t } = useTranslation('staff');
  const from = bucharestInstant(todayKey).toISOString();
  const exceptions = useQuery(staffQueries.exceptions(inspectorId, from));
  const removeException = useRemoveException(inspectorId);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <DashboardPanel
      title={t('availability.exceptions.title')}
      subtitle={t('availability.exceptions.subtitle')}
      actions={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="touch-target"
          onClick={() => {
            setIsAdding(true);
          }}
        >
          <PlusIcon aria-hidden />
          {t('availability.exceptions.add')}
        </Button>
      }
    >
      <div className="flex flex-col gap-2.5">
        {exceptions.isPending ? (
          <Skeleton className="h-15" />
        ) : exceptions.isError && !exceptions.data ? (
          <EmptyState kind="error" title={t('availability.exceptions.error')} />
        ) : exceptions.data.length === 0 ? (
          <EmptyState
            title={t('availability.exceptions.empty.title')}
            description={t('availability.exceptions.empty.text')}
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {exceptions.data.map((exception) => {
              const Icon = EXCEPTION_ICON[exception.kind];
              const kindLabel = t(`availability.exceptions.kind.${exception.kind}`);
              const note = exception.note;
              return (
                <li
                  key={exception.id}
                  className="flex items-center gap-3 rounded-md bg-background py-2.5 pr-1 pl-3"
                >
                  <Icon aria-hidden className="size-4.5 shrink-0 text-brand" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <strong className="text-small tabular-nums">
                      {exceptionWhen(exception.starts_at, exception.ends_at, t)}
                    </strong>
                    <span className="text-small text-muted-foreground">
                      {note
                        ? t('availability.exceptions.kindWithNote', { kind: kindLabel, note })
                        : kindLabel}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t('availability.exceptions.remove')}
                    disabled={
                      removeException.isPending && removeException.variables === exception.id
                    }
                    onClick={() => {
                      removeException.mutate(exception.id);
                    }}
                  >
                    <Trash2Icon aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {isAdding ? (
        <ExceptionDialog
          inspectorId={inspectorId}
          defaultDate={todayKey}
          isOpen
          onOpenChange={setIsAdding}
        />
      ) : null}
    </DashboardPanel>
  );
}

function isMidnight(date: Date): boolean {
  const { hours, minutes } = bucharestTime(date);
  return hours === 0 && minutes === 0;
}

function exceptionWhen(
  startsAtValue: string,
  endsAtValue: string,
  t: ReturnType<typeof useTranslation<'staff'>>['t'],
): string {
  const startsAt = new Date(startsAtValue);
  const endsAt = new Date(endsAtValue);
  const dayFormat = { day: 'numeric', month: 'short', year: 'numeric' } as const;
  const timeFormat = { hour: '2-digit', minute: '2-digit' } as const;
  if (isMidnight(startsAt) && isMidnight(endsAt)) {
    const firstKey = bucharestDay(startsAt);
    const lastKey = bucharestDay(new Date(endsAt.getTime() - 1));
    return firstKey === lastKey
      ? formatDate(fromDateKey(firstKey), dayFormat)
      : t('availability.exceptions.range', {
          from: formatDate(fromDateKey(firstKey), dayFormat),
          to: formatDate(fromDateKey(lastKey), dayFormat),
        });
  }
  if (bucharestDay(startsAt) === bucharestDay(endsAt)) {
    return t('availability.exceptions.hours', {
      day: formatDate(startsAt, dayFormat),
      from: formatDate(startsAt, timeFormat),
      to: formatDate(endsAt, timeFormat),
    });
  }
  return t('availability.exceptions.range', {
    from: formatDate(startsAt, { ...dayFormat, ...timeFormat }),
    to: formatDate(endsAt, { ...dayFormat, ...timeFormat }),
  });
}
