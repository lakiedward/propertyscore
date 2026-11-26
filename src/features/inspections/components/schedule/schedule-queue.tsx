import { useDraggable } from '@dnd-kit/core';
import {
  ChevronRightIcon,
  GripVerticalIcon,
  PanelLeftCloseIcon,
  RotateCcwIcon,
} from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '@/components/forms/date-picker';
import { EmptyState } from '@/components/layout/empty-state';
import { DashboardPanel } from '@/components/report/dashboard-panel';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/i18n/format';
import { bucharestDay } from '@/lib/bucharest-time';
import { cn } from '@/lib/utils';
import type { AdminInspection } from '../../inspection.types';
import { CityFilterSelect } from './city-filter-select';
import { ScheduleFilterField } from './schedule-filter-field';

const DAY = { weekday: 'long', day: 'numeric', month: 'short' } as const;

const TIME = { hour: '2-digit', minute: '2-digit' } as const;

type ScheduleQueueProps = {
  inspections: readonly AdminInspection[];
  cityId: string | undefined;
  day: string | undefined;
  onCityChange: (cityId: string | undefined) => void;
  onDayChange: (day: string | undefined) => void;
  pickedId: string | undefined;
  draggableDay: string | undefined;
  onPick: (inspection: AdminInspection) => void;
  onOpen: (inspectionId: string) => void;
  onHide: () => void;
};

export function ScheduleQueue({
  inspections,
  cityId,
  day,
  onCityChange,
  onDayChange,
  pickedId,
  draggableDay,
  onPick,
  onOpen,
  onHide,
}: ScheduleQueueProps) {
  const { t } = useTranslation('inspections');
  const cityPickerId = useId();
  const dayPickerId = useId();
  const cities = Array.from(
    new Map(inspections.map((inspection) => [inspection.city_id, inspection.city_name])),
    ([id, name]) => ({ id, name }),
  );
  const inCity = cityId
    ? inspections.filter((inspection) => inspection.city_id === cityId)
    : inspections;
  const allDays = groupByDay(inCity);
  const days = day ? allDays.filter((group) => group.key === day) : allDays;
  const count = days.reduce((total, group) => total + group.items.length, 0);
  const isFiltered = cityId !== undefined || day !== undefined;

  return (
    <DashboardPanel
      title={t('schedule.queue.heading')}
      subtitle={t('schedule.queue.count', { count })}
      isFlush
      isScrollable
      className="h-full max-h-[75svh] lg:max-h-none"
      actions={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="touch-target -mr-1.5"
          aria-label={t('schedule.queue.hide')}
          title={t('schedule.queue.hide')}
          onClick={onHide}
        >
          <PanelLeftCloseIcon aria-hidden />
        </Button>
      }
      toolbar={
        <div className="flex flex-col gap-3">
          <ScheduleFilterField label={t('schedule.queue.city')} htmlFor={cityPickerId}>
            <CityFilterSelect
              id={cityPickerId}
              cities={cities}
              value={cityId}
              onChange={onCityChange}
            />
          </ScheduleFilterField>
          <ScheduleFilterField label={t('schedule.queue.day')} htmlFor={dayPickerId}>
            <DatePicker
              id={dayPickerId}
              value={day ?? ''}
              onChange={onDayChange}
              placeholder={t('schedule.queue.allDays')}
              onClear={() => {
                onDayChange(undefined);
              }}
              clearLabel={t('schedule.queue.clearDay')}
              markedDays={new Set(allDays.map((group) => group.key))}
            />
          </ScheduleFilterField>
          {isFiltered ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="touch-target -ml-2 self-start text-brand"
              onClick={() => {
                onCityChange(undefined);
              }}
            >
              <RotateCcwIcon aria-hidden />
              {t('schedule.resetFilters')}
            </Button>
          ) : null}
        </div>
      }
    >
      {count === 0 ? (
        <div className="p-2.5">
          {isFiltered ? (
            <EmptyState
              title={t('schedule.queue.noMatch.title')}
              description={t('schedule.queue.noMatch.text')}
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="touch-target"
                  onClick={() => {
                    onCityChange(undefined);
                  }}
                >
                  {t('schedule.queue.noMatch.reset')}
                </Button>
              }
            />
          ) : (
            <EmptyState
              title={t('schedule.queue.empty.title')}
              description={t('schedule.queue.empty.text')}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-2.5">
          {days.map((group) => (
            <section key={group.key} aria-label={group.label} className="flex flex-col gap-2">
              <h3 className="flex items-center justify-between gap-2 px-1 text-meta font-bold text-muted-foreground uppercase">
                <span className="truncate">{group.label}</span>
                <span className="tabular-nums">{group.items.length}</span>
              </h3>
              <ul className="flex flex-col gap-2">
                {group.items.map((inspection) => (
                  <QueueItem
                    key={inspection.id}
                    inspection={inspection}
                    isPicked={inspection.id === pickedId}
                    isDraggable={group.key === draggableDay}
                    onPick={onPick}
                    onOpen={onOpen}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </DashboardPanel>
  );
}

function groupByDay(inspections: readonly AdminInspection[]) {
  const days = new Map<string, AdminInspection[]>();
  for (const inspection of inspections) {
    const key = bucharestDay(new Date(inspection.starts_at));
    days.set(key, [...(days.get(key) ?? []), inspection]);
  }
  return Array.from(days, ([key, items]) => ({
    key,
    label: formatDate(items[0]?.starts_at ?? key, DAY),
    items,
  }));
}

type QueueItemProps = {
  inspection: AdminInspection;
  isPicked: boolean;
  isDraggable: boolean;
  onPick: (inspection: AdminInspection) => void;
  onOpen: (inspectionId: string) => void;
};

function QueueItem({ inspection, isPicked, isDraggable, onPick, onOpen }: QueueItemProps) {
  const { t } = useTranslation('inspections');
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: inspection.id,
    disabled: !isDraggable,
  });

  return (
    <li
      className={cn(
        'relative min-w-0 overflow-hidden rounded-md border-[1.5px] bg-card transition-colors duration-(--duration-fast)',
        isPicked
          ? 'border-primary shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary'
          : 'border-border hover:border-border-strong',
        isDragging && 'opacity-50',
      )}
    >
      <button
        ref={setNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-pressed={isPicked}
        aria-roledescription={isDraggable ? t('schedule.queue.roleDescription') : undefined}
        onClick={() => {
          onPick(inspection);
        }}
        className={cn(
          'flex w-full min-w-0 flex-col gap-1.5 py-2.5 pr-2.5 pl-3.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset',
          isDraggable && 'cursor-grab touch-none',
        )}
      >
        <span className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'inline-flex h-6 items-center rounded-sm px-2 text-caption font-bold tabular-nums',
              isPicked ? 'bg-primary text-primary-foreground' : 'bg-secondary text-brand',
            )}
          >
            {t('schedule.range', {
              from: formatDate(inspection.starts_at, TIME),
              to: formatDate(inspection.ends_at, TIME),
            })}
          </span>
          {isDraggable ? (
            <GripVerticalIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          ) : null}
        </span>
        <span className="line-clamp-2 text-small leading-[1.35] font-semibold">
          {inspection.address_text}
        </span>
      </button>
      {isPicked ? (
        <div className="flex justify-end px-2.5 pb-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="touch-target text-brand"
            onClick={() => {
              onOpen(inspection.id);
            }}
          >
            {t('schedule.queue.details')}
            <ChevronRightIcon aria-hidden />
          </Button>
        </div>
      ) : null}
    </li>
  );
}
