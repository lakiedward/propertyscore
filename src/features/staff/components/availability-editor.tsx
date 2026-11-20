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
import { SlotPicker } from '@/components/forms/slot-picker';
import { DashboardPanel } from '@/components/report/dashboard-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { INSPECTION_START_TIMES } from '@/features/inspections';
import { formatDate } from '@/i18n/format';
import { staffQueries, useRemoveException, useSetWeeklyHours } from '../api/staff.queries';
import { WEEKDAYS, type InspectorExceptionKind, type TimeRange } from '../staff.types';
import {
  freeStartsByDay,
  localDateKey,
  localDateTime,
  previewDayKeys,
  weeklyRangesByDay,
} from '../staff.utils';
import { ExceptionDialog } from './exception-dialog';
import { WeeklyHoursDialog } from './weekly-hours-dialog';

const PREVIEW_DAYS = 14;

const PREVIEW_STEPS = ['weekly', 'exceptions', 'visits'] as const;

const DEFAULT_RANGES: readonly TimeRange[] = [{ startsAt: '08:00', endsAt: '17:00' }];

const EXCEPTION_ICON = {
  day_off: PalmtreeIcon,
  leave: PlaneIcon,
  training: ClockIcon,
  other: CalendarXIcon,
} as const satisfies Record<InspectorExceptionKind, LucideIcon>;

type AvailabilityEditorProps = {
  inspectorId: string;
  inspectorName: string | null;
  description: string;
  toolbar?: ReactNode;
};

export function AvailabilityEditor({
  inspectorId,
  inspectorName,
  description,
  toolbar,
}: AvailabilityEditorProps) {
  const { t } = useTranslation('staff');
  const [now] = useState(() => new Date());
  const todayKey = localDateKey(now);

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-4">
        <DashboardPanel
          title={t('availability.weekly.title')}
          subtitle={t('availability.weekly.subtitle')}
        >
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <span className="max-w-90 text-small text-muted-foreground">{description}</span>
              {toolbar}
            </div>
            <WeeklyHours inspectorId={inspectorId} />
          </div>
        </DashboardPanel>
        <Exceptions inspectorId={inspectorId} todayKey={todayKey} />
      </div>
      <AvailabilityPreview inspectorId={inspectorId} inspectorName={inspectorName} now={now} />
    </div>
  );
}

function weekdayName(weekday: number): string {
  return formatDate(new Date(2024, 0, weekday), { weekday: 'long' });
}

function WeeklyHours({ inspectorId }: { inspectorId: string }) {
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

  const byDay = weeklyRangesByDay(hours.data ?? []);

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

function Exceptions({ inspectorId, todayKey }: { inspectorId: string; todayKey: string }) {
  const { t } = useTranslation('staff');
  const from = localDateTime(todayKey, '00:00').toISOString();
  const exceptions = useQuery(staffQueries.exceptions(inspectorId, from));
  const removeException = useRemoveException(inspectorId);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <DashboardPanel
      title={t('availability.exceptions.title')}
      subtitle={t('availability.exceptions.subtitle')}
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex justify-end">
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
        </div>
        {exceptions.isPending ? (
          <Skeleton className="h-15" />
        ) : (exceptions.data ?? []).length === 0 ? (
          <p className="text-small text-muted-foreground">{t('availability.exceptions.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {(exceptions.data ?? []).map((exception) => {
              const Icon = EXCEPTION_ICON[exception.kind];
              const kindLabel = t(`availability.exceptions.kind.${exception.kind}`);
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
                      {exception.note ? `${kindLabel} · ${exception.note}` : kindLabel}
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
  return date.getHours() === 0 && date.getMinutes() === 0;
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
    const lastDay = new Date(endsAt.getTime() - 1);
    return localDateKey(startsAt) === localDateKey(lastDay)
      ? formatDate(startsAt, dayFormat)
      : t('availability.exceptions.range', {
          from: formatDate(startsAt, dayFormat),
          to: formatDate(lastDay, dayFormat),
        });
  }
  if (localDateKey(startsAt) === localDateKey(endsAt)) {
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

type AvailabilityPreviewProps = {
  inspectorId: string;
  inspectorName: string | null;
  now: Date;
};

function AvailabilityPreview({ inspectorId, inspectorName, now }: AvailabilityPreviewProps) {
  const { t } = useTranslation('staff');
  const dayKeys = previewDayKeys(now, PREVIEW_DAYS);
  const firstDay = dayKeys[0] ?? localDateKey(now);
  const lastDay = dayKeys.at(-1) ?? firstDay;
  const profile = useQuery(staffQueries.inspectorProfile(inspectorId));
  const freeStarts = useQuery(staffQueries.freeStarts(inspectorId, firstDay, lastDay));
  const byDay = freeStartsByDay(freeStarts.data ?? []);
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [pickedTime, setPickedTime] = useState<string | null>(null);
  const day = pickedDay ?? dayKeys.find((key) => byDay.has(key)) ?? null;
  const freeOnDay = day ? byDay.get(day) : undefined;

  return (
    <aside className="flex flex-col gap-3 rounded-lg bg-step-slate-soft p-4.5">
      <span className="text-eyebrow text-info-ink-muted">{t('availability.preview.eyebrow')}</span>
      <strong className="text-[17px] leading-[1.35]">
        {inspectorName
          ? t('availability.preview.titleNamed', { name: inspectorName })
          : t('availability.preview.title')}
      </strong>
      <ol className="flex flex-col gap-1.5 text-small">
        {PREVIEW_STEPS.map((step, index) => (
          <li key={step} className="flex gap-2">
            <strong className="text-info-ink-muted tabular-nums">{index + 1}</strong>
            {t(`availability.preview.steps.${step}`)}
          </li>
        ))}
      </ol>
      <div className="rounded-lg bg-card p-3">
        {freeStarts.isPending ? (
          <Skeleton className="h-55" />
        ) : (
          <SlotPicker
            days={dayKeys.map((key) => {
              const date = localDateTime(key, '00:00');
              return {
                value: key,
                weekday: formatDate(date, { weekday: 'short' }),
                day: formatDate(date, { day: 'numeric' }),
                month: formatDate(date, { month: 'short' }),
                label: formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' }),
                isDisabled: !byDay.has(key),
              };
            })}
            times={INSPECTION_START_TIMES.map((time) => ({
              value: time,
              label: time,
              isDisabled: !day || !freeOnDay?.has(localDateTime(day, time).getTime()),
            }))}
            day={day}
            time={pickedTime}
            onDayChange={(value) => {
              setPickedDay(value);
              setPickedTime(null);
            }}
            onTimeChange={setPickedTime}
            dayLabel={t('availability.preview.day')}
            timeLabel={t('availability.preview.time')}
            emptyText={t('availability.preview.empty')}
          />
        )}
      </div>
      {profile.data?.city ? (
        <span className="text-meta text-muted-foreground">
          {t('availability.preview.note', { city: profile.data.city.name })}
        </span>
      ) : null}
    </aside>
  );
}
