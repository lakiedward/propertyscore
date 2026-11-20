import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { DashboardPanel } from '@/components/report/dashboard-panel';
import { StatusPill } from '@/components/feedback/status-pill';
import { initialsOf } from '@/features/profile';
import { formatDate } from '@/i18n/format';
import { cn } from '@/lib/utils';
import type {
  AdminInspection,
  AdminInspector,
  InspectorBlock,
  WorkingRange,
} from '../../inspection.types';
import {
  assignmentClash,
  GRID_HOURS,
  GRID_START_HOUR,
  gridPosition,
  HOUR_HEIGHT,
  offBlocks,
} from '../../schedule.utils';
import { InspectionStatusPill } from '../inspection-status-pill';
import { scheduleItemVariants } from './schedule-item-look';

const TIME = { hour: '2-digit', minute: '2-digit' } as const;

const HOURS = Array.from({ length: GRID_HOURS }, (_, index) => GRID_START_HOUR + index);

type ScheduleDayBoardProps = {
  day: Date;
  title: string;
  inspectors: readonly AdminInspector[];
  inspections: readonly AdminInspection[];
  ranges: readonly WorkingRange[];
  blocks: readonly InspectorBlock[];
  dragged: AdminInspection | undefined;
  onOpen: (inspectionId: string) => void;
};

export function ScheduleDayBoard({
  day,
  title,
  inspectors,
  inspections,
  ranges,
  blocks,
  dragged,
  onOpen,
}: ScheduleDayBoardProps) {
  const { t } = useTranslation('inspections');
  const assigned = inspections.filter((inspection) => inspection.inspector_id !== null);
  const columns = `56px repeat(${String(Math.max(inspectors.length, 1))}, minmax(160px, 1fr))`;

  return (
    <DashboardPanel
      title={title}
      subtitle={t('schedule.day.subtitle', {
        count: inspectors.length,
        visits: assigned.length,
      })}
      isFlush
      className="min-w-0"
    >
      {inspectors.length === 0 ? (
        <p className="p-4 text-small text-muted-foreground">{t('schedule.day.noInspectors')}</p>
      ) : (
        <div className="overflow-x-auto rounded-b-lg">
          <div className="min-w-fit">
            <div className="grid border-b border-border" style={{ gridTemplateColumns: columns }}>
              <span />
              {inspectors.map((inspector) => {
                const load = assigned.filter(
                  (item) => item.inspector_id === inspector.user_id,
                ).length;
                return (
                  <div
                    key={inspector.user_id}
                    className="flex items-center gap-2.5 border-l border-border-subtle px-3 py-2.5"
                  >
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-meta font-extrabold text-primary-foreground"
                    >
                      {initialsOf(inspector.full_name ?? '')}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <strong className="truncate text-small">{inspector.full_name}</strong>
                      <span className="text-meta text-muted-foreground">
                        {t('schedule.day.load', { city: inspector.city_name, count: load })}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="relative grid" style={{ gridTemplateColumns: columns }}>
              <div className="flex flex-col">
                {HOURS.map((hour) => (
                  <span
                    key={hour}
                    className="box-border border-t border-border-subtle px-2 pt-1 text-right text-meta text-muted-foreground tabular-nums"
                    style={{ height: HOUR_HEIGHT }}
                  >
                    {formatDate(
                      new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour),
                      TIME,
                    )}
                  </span>
                ))}
              </div>
              {inspectors.map((inspector) => (
                <InspectorColumn
                  key={inspector.user_id}
                  day={day}
                  inspector={inspector}
                  inspections={inspections}
                  assigned={assigned}
                  ranges={ranges}
                  blocks={blocks}
                  dragged={dragged}
                  onOpen={onOpen}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardPanel>
  );
}

type InspectorColumnProps = {
  day: Date;
  inspector: AdminInspector;
  inspections: readonly AdminInspection[];
  assigned: readonly AdminInspection[];
  ranges: readonly WorkingRange[];
  blocks: readonly InspectorBlock[];
  dragged: AdminInspection | undefined;
  onOpen: (inspectionId: string) => void;
};

function InspectorColumn({
  day,
  inspector,
  inspections,
  assigned,
  ranges,
  blocks,
  dragged,
  onOpen,
}: InspectorColumnProps) {
  const { t } = useTranslation('inspections');
  const { setNodeRef, isOver } = useDroppable({ id: inspector.user_id });
  const items = inspections.filter((inspection) => inspection.inspector_id === inspector.user_id);
  const draggedOnDay =
    dragged && new Date(dragged.starts_at).toDateString() === day.toDateString()
      ? dragged
      : undefined;
  const clash =
    isOver && draggedOnDay
      ? assignmentClash({
          inspection: draggedOnDay,
          inspectorId: inspector.user_id,
          assigned,
          ranges,
          blocks,
        })
      : null;

  return (
    <div
      ref={setNodeRef}
      aria-label={t('schedule.day.column', { name: inspector.full_name ?? '' })}
      className={cn(
        'relative border-l border-border-subtle bg-[repeating-linear-gradient(to_bottom,var(--color-border-subtle)_0_1px,transparent_1px_56px)]',
        isOver && 'outline-2 -outline-offset-3 outline-primary',
      )}
      style={{ height: GRID_HOURS * HOUR_HEIGHT }}
    >
      {offBlocks(inspector.user_id, day, ranges, blocks).map((block) => (
        <div
          key={block.key}
          className="absolute inset-x-0 bg-[repeating-linear-gradient(135deg,var(--color-disabled)_0_6px,var(--color-surface-sunken)_6px_12px)]"
          style={{ top: block.top, height: block.height }}
        >
          <span className="absolute top-1 left-2 text-meta text-muted-foreground">
            {t('schedule.day.unavailable')}
          </span>
        </div>
      ))}
      {items.map((item) => {
        const position = gridPosition(item, day);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onOpen(item.id);
            }}
            className={cn(
              scheduleItemVariants({ status: item.status }),
              'absolute inset-x-1.5 box-border flex flex-col gap-0.75 overflow-hidden px-2.5 py-2',
            )}
            style={{ top: position.top, height: position.height }}
          >
            <strong className="text-caption tabular-nums">
              {t('schedule.range', {
                from: formatDate(item.starts_at, TIME),
                to: formatDate(item.ends_at, TIME),
              })}
            </strong>
            <span className="text-caption leading-[1.3] font-bold">{item.address_text}</span>
            <InspectionStatusPill status={item.status} audience="client" />
          </button>
        );
      })}
      {isOver && draggedOnDay ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-x-1.5 box-border flex flex-col gap-0.5 rounded-md border-2 border-dashed px-2.5 py-2',
            clash
              ? 'border-destructive bg-card text-destructive'
              : 'border-primary bg-cta text-cta-foreground',
          )}
          style={gridPosition(draggedOnDay, day)}
        >
          <strong className="text-caption tabular-nums">
            {t('schedule.range', {
              from: formatDate(draggedOnDay.starts_at, TIME),
              to: formatDate(draggedOnDay.ends_at, TIME),
            })}
          </strong>
          <span className="text-caption font-bold">
            {clash ? t(`schedule.ghost.${clash}`) : t('schedule.ghost.free')}
          </span>
        </div>
      ) : null}
      {isOver && dragged && !draggedOnDay ? (
        <div className="pointer-events-none absolute inset-x-1.5 top-2">
          <StatusPill tone="warning" label={t('schedule.ghost.otherDay')} />
        </div>
      ) : null}
    </div>
  );
}
