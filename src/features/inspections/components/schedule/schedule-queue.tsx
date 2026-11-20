import { useDraggable } from '@dnd-kit/core';
import { GripVerticalIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardPanel } from '@/components/report/dashboard-panel';
import { formatDate } from '@/i18n/format';
import { cn } from '@/lib/utils';
import type { AdminInspection } from '../../inspection.types';
import { InspectionStatusPill } from '../inspection-status-pill';

const WHEN = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
} as const;

type ScheduleQueueProps = {
  inspections: readonly AdminInspection[];
  isDraggable: boolean;
  onOpen: (inspectionId: string) => void;
};

export function ScheduleQueue({ inspections, isDraggable, onOpen }: ScheduleQueueProps) {
  const { t } = useTranslation('inspections');

  return (
    <DashboardPanel
      title={t('schedule.queue.title', { count: inspections.length })}
      subtitle={isDraggable ? t('schedule.queue.dragHint') : t('schedule.queue.clickHint')}
      isFlush
    >
      {inspections.length === 0 ? (
        <p className="p-4 text-small text-muted-foreground">{t('schedule.queue.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2 p-2.5">
          {inspections.map((inspection) => (
            <QueueItem
              key={inspection.id}
              inspection={inspection}
              isDraggable={isDraggable}
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}
    </DashboardPanel>
  );
}

type QueueItemProps = {
  inspection: AdminInspection;
  isDraggable: boolean;
  onOpen: (inspectionId: string) => void;
};

function QueueItem({ inspection, isDraggable, onOpen }: QueueItemProps) {
  const { t } = useTranslation('inspections');
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: inspection.id,
    disabled: !isDraggable,
  });

  return (
    <li className="min-w-0">
      <button
        ref={setNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-roledescription={isDraggable ? t('schedule.queue.roleDescription') : undefined}
        onClick={() => {
          onOpen(inspection.id);
        }}
        style={
          transform
            ? { transform: `translate(${String(transform.x)}px, ${String(transform.y)}px)` }
            : undefined
        }
        className={cn(
          'relative flex w-full min-w-0 flex-col gap-1 overflow-hidden rounded-md border-[1.5px] border-border bg-card px-3 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring',
          isDraggable && 'cursor-grab touch-none',
          isDragging && 'z-10 border-primary opacity-90 shadow-md',
        )}
      >
        <span className="flex items-center justify-between gap-2">
          <strong className="text-small tabular-nums first-letter:uppercase">
            {formatDate(inspection.starts_at, WHEN)}
          </strong>
          {isDraggable ? (
            <GripVerticalIcon aria-hidden className="size-4 text-muted-foreground" />
          ) : null}
        </span>
        <span className="text-small leading-[1.3] font-bold">{inspection.address_text}</span>
        <span className="text-small text-muted-foreground">
          {t('schedule.queue.meta', { city: inspection.city_name })}
        </span>
        <InspectionStatusPill status={inspection.status} audience="client" />
      </button>
    </li>
  );
}
