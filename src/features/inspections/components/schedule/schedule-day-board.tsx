import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { InitialsAvatar } from '@/components/layout/initials-avatar';
import { DashboardPanel } from '@/components/report/dashboard-panel';
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
  title: ReactNode;
  toolbar: ReactNode;
  inspectors: readonly AdminInspector[];
  inspections: readonly AdminInspection[];
  ranges: readonly WorkingRange[];
  blocks: readonly InspectorBlock[];
  dragged: AdminInspection | undefined;
  picked: AdminInspection | undefined;
  isAssigning: boolean;
  onAssign: (inspection: AdminInspection, inspectorId: string) => void;
  onOpen: (inspectionId: string) => void;
};

export function ScheduleDayBoard({
  day,
  title,
  toolbar,
  inspectors,
  inspections,
  ranges,
  blocks,
  dragged,
  picked,
  isAssigning,
  onAssign,
  onOpen,
}: ScheduleDayBoardProps) {
  const { t } = useTranslation('inspections');
  const assigned = inspections.filter((inspection) => inspection.inspector_id !== null);
  const columns = `56px repeat(${String(Math.max(inspectors.length, 1))}, minmax(160px, 1fr))`;

  return (
    <DashboardPanel
      title={title}
      toolbar={toolbar}
      subtitle={t('schedule.day.subtitle', {
        count: inspectors.length,
        visits: assigned.length,
      })}
      isFlush
      className="min-w-0"
    >
      {inspectors.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title={t('schedule.day.noInspectors.title')}
            description={t('schedule.day.noInspectors.text')}
          />
        </div>
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
                    <InitialsAvatar name={inspector.full_name ?? ''} />
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
                  picked={picked}
                  isAssigning={isAssigning}
                  onAssign={onAssign}
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
  picked: AdminInspection | undefined;
  isAssigning: boolean;
  onAssign: (inspection: AdminInspection, inspectorId: string) => void;
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
  picked,
  isAssigning,
  onAssign,
  onOpen,
}: InspectorColumnProps) {
  const { t } = useTranslation('inspections');
  const { setNodeRef, isOver } = useDroppable({ id: inspector.user_id });
  const items = inspections.filter((inspection) => inspection.inspector_id === inspector.user_id);
  const name = inspector.full_name ?? '';
  const isDropTarget =
    isOver && dragged !== undefined && dragged.inspector_id !== inspector.user_id;
  const dropClash = isDropTarget
    ? assignmentClash({
        inspection: dragged,
        inspectorId: inspector.user_id,
        assigned,
        ranges,
        blocks,
      })
    : null;
  const pickClash = picked
    ? assignmentClash({
        inspection: picked,
        inspectorId: inspector.user_id,
        assigned,
        ranges,
        blocks,
      })
    : null;

  return (
    <div
      ref={setNodeRef}
      role="group"
      aria-label={t('schedule.day.column', { name })}
      className={cn(
        'relative border-l border-border-subtle bg-[repeating-linear-gradient(to_bottom,var(--color-border-subtle)_0_1px,transparent_1px_56px)]',
        isDropTarget && 'outline-2 -outline-offset-3 outline-primary',
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
      {items.map((item) => (
        <BoardItem key={item.id} item={item} day={day} onOpen={onOpen} />
      ))}
      {picked ? (
        pickClash ? (
          <div
            className="pointer-events-none absolute inset-x-1.5 box-border flex flex-col gap-0.5 rounded-md border-2 border-dashed border-border-strong bg-card/90 px-2.5 py-2 text-muted-foreground"
            style={gridPosition(picked, day)}
          >
            <strong className="text-caption tabular-nums">{rangeLabel(picked, t)}</strong>
            <span className="text-caption font-bold">{t(`schedule.ghost.${pickClash}`)}</span>
          </div>
        ) : (
          <button
            type="button"
            disabled={isAssigning}
            onClick={() => {
              onAssign(picked, inspector.user_id);
            }}
            className="absolute inset-x-1.5 z-10 box-border flex flex-col items-start gap-0.5 rounded-md border-2 border-primary bg-cta px-2.5 py-2 text-left text-cta-foreground shadow-md outline-none hover:bg-cta-hover focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-60"
            style={gridPosition(picked, day)}
          >
            <strong className="text-caption tabular-nums">{rangeLabel(picked, t)}</strong>
            <span className="text-caption font-bold">{t('schedule.assignTo', { name })}</span>
          </button>
        )
      ) : null}
      {isDropTarget ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-x-1.5 box-border flex flex-col gap-0.5 rounded-md border-2 border-dashed px-2.5 py-2',
            dropClash
              ? 'border-destructive bg-card text-destructive'
              : 'border-primary bg-cta text-cta-foreground',
          )}
          style={gridPosition(dragged, day)}
        >
          <strong className="text-caption tabular-nums">{rangeLabel(dragged, t)}</strong>
          <span className="text-caption font-bold">
            {dropClash ? t(`schedule.ghost.${dropClash}`) : t('schedule.ghost.free')}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function rangeLabel(
  inspection: AdminInspection,
  t: ReturnType<typeof useTranslation<'inspections'>>['t'],
) {
  return t('schedule.range', {
    from: formatDate(inspection.starts_at, TIME),
    to: formatDate(inspection.ends_at, TIME),
  });
}

const REASSIGNABLE = new Set<AdminInspection['status']>(['inspector_assigned']);

type BoardItemProps = {
  item: AdminInspection;
  day: Date;
  onOpen: (inspectionId: string) => void;
};

function BoardItem({ item, day, onOpen }: BoardItemProps) {
  const { t } = useTranslation('inspections');
  const isDraggable = REASSIGNABLE.has(item.status) && new Date(item.starts_at) > new Date();
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: item.id,
    disabled: !isDraggable,
  });
  const position = gridPosition(item, day);

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      aria-roledescription={isDraggable ? t('schedule.day.roleDescription') : undefined}
      onClick={() => {
        onOpen(item.id);
      }}
      className={cn(
        scheduleItemVariants({ status: item.status }),
        'absolute inset-x-1.5 box-border flex flex-col gap-0.75 overflow-hidden px-2.5 py-2',
        isDraggable && 'cursor-grab touch-none',
        isDragging && 'z-20 opacity-90 shadow-md',
      )}
      style={{
        top: position.top,
        height: position.height,
        transform: transform
          ? `translate(${String(transform.x)}px, ${String(transform.y)}px)`
          : undefined,
      }}
    >
      <strong className="text-caption tabular-nums">{rangeLabel(item, t)}</strong>
      <span className="text-caption leading-[1.3] font-bold">{item.address_text}</span>
      <InspectionStatusPill status={item.status} audience="client" />
    </button>
  );
}
