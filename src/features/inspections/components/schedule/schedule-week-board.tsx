import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardPanel } from '@/components/report/dashboard-panel';
import { initialsOf } from '@/features/profile';
import { formatDate } from '@/i18n/format';
import { cn } from '@/lib/utils';
import type { AdminInspection, AdminInspector, WorkingRange } from '../../inspection.types';
import { isoWeekday } from '../../schedule.utils';
import { addDays, dateKey } from '../../slots.utils';
import { scheduleItemVariants } from './schedule-item-look';

const TIME = { hour: '2-digit', minute: '2-digit' } as const;

type ScheduleWeekBoardProps = {
  start: Date;
  title: ReactNode;
  toolbar: ReactNode;
  subtitle: string;
  inspectors: readonly AdminInspector[];
  inspections: readonly AdminInspection[];
  ranges: readonly WorkingRange[];
  today: string;
  onOpen: (inspectionId: string) => void;
};

export function ScheduleWeekBoard({
  start,
  title,
  toolbar,
  subtitle,
  inspectors,
  inspections,
  ranges,
  today,
  onOpen,
}: ScheduleWeekBoardProps) {
  const { t } = useTranslation('inspections');
  const names = new Map(
    inspectors.map((inspector) => [inspector.user_id, inspector.full_name ?? '']),
  );
  const inspectorIds = new Set(names.keys());
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));

  return (
    <DashboardPanel title={title} toolbar={toolbar} subtitle={subtitle} isFlush className="min-w-0">
      <div className="overflow-x-auto rounded-b-lg">
        <div className="grid min-w-[700px] grid-cols-7">
          {days.map((day) => {
            const key = dateKey(day);
            const items = inspections.filter((item) => dateKey(new Date(item.starts_at)) === key);
            const isClosed = !ranges.some(
              (range) => inspectorIds.has(range.inspector_id) && range.weekday === isoWeekday(day),
            );
            const isToday = key === today;
            return (
              <div
                key={key}
                className={cn(
                  'flex min-h-130 flex-col border-l border-border-subtle',
                  isToday && 'bg-surface-highlight',
                )}
              >
                <div className="flex flex-col border-b border-border-subtle p-2.5">
                  <span className="text-meta text-muted-foreground first-letter:uppercase">
                    {formatDate(day, { weekday: 'short' })}
                  </span>
                  <strong className={cn('text-[20px] tabular-nums', isToday && 'text-brand')}>
                    {day.getDate()}
                  </strong>
                </div>
                <div className="flex flex-col gap-1.5 p-2">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onOpen(item.id);
                      }}
                      className={cn(
                        scheduleItemVariants({ status: item.status }),
                        'flex flex-col gap-0.5 px-2 py-1.75',
                      )}
                    >
                      <span className="flex justify-between gap-1">
                        <strong className="text-meta tabular-nums">
                          {formatDate(item.starts_at, TIME)}
                        </strong>
                        <span className="text-[11px] font-extrabold text-muted-foreground">
                          {item.inspector_id
                            ? initialsOf(names.get(item.inspector_id) ?? item.inspector_name ?? '')
                            : ''}
                        </span>
                      </span>
                      <span className="text-meta leading-[1.3] font-bold">{item.address_text}</span>
                    </button>
                  ))}
                  {isClosed && items.length === 0 ? (
                    <span className="text-meta text-muted-foreground">
                      {t('schedule.week.closed')}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardPanel>
  );
}
