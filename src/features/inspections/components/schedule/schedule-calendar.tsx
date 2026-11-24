import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { PanelLeftOpenIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineToast } from '@/components/feedback/inline-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStoredFlag } from '@/hooks/use-stored-flag';
import { useErrorMessage } from '@/i18n/error-message';
import { formatDate } from '@/i18n/format';
import { cn } from '@/lib/utils';
import {
  inspectionQueries,
  useAssignInspector,
  useUnassignInspector,
} from '../../api/inspections.queries';
import type { AdminInspection, ScheduleView } from '../../inspection.types';
import { dayStart, scheduleRange, shiftScheduleDate } from '../../schedule.utils';
import { addDays, dateKey } from '../../slots.utils';
import { AdminAppointmentDrawer } from './admin-appointment-drawer';
import { ScheduleDayBoard } from './schedule-day-board';
import { ScheduleQueue } from './schedule-queue';
import { ScheduleDateNav } from './schedule-date-nav';
import { ScheduleFilters } from './schedule-filters';
import { ScheduleWeekBoard } from './schedule-week-board';

const route = getRouteApi('/_authenticated/admin/appointments');

const DRAG_DISTANCE = 6;

const QUEUE_HIDDEN_STORAGE_KEY = 'ps-schedule-queue-hidden';

type Notice =
  | { kind: 'assigned'; inspectionId: string; previousInspectorId: string | null; text: string }
  | { kind: 'conflict'; title: string; text: string };

export function ScheduleCalendar() {
  const { t } = useTranslation('inspections');
  const errorMessage = useErrorMessage();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const [today] = useState(() => dateKey(new Date()));
  const date = search.date ?? today;
  const view: ScheduleView = search.view;
  const cityId = search.city ?? null;
  const { from, to } = scheduleRange(date, view);
  const schedule = useQuery({
    ...inspectionQueries.schedule(from.toISOString(), to.toISOString(), cityId),
    placeholderData: keepPreviousData,
  });
  const unassigned = useQuery(inspectionQueries.unassigned(null));
  const inspectors = useQuery(inspectionQueries.inspectors(cityId));
  const allInspectors = useQuery(inspectionQueries.inspectors(null));
  const shown = (inspectors.data ?? []).filter(
    (inspector) =>
      inspector.is_active && (!search.inspector || inspector.user_id === search.inspector),
  );
  const ids = (inspectors.data ?? []).map((inspector) => inspector.user_id);
  const ranges = useQuery(inspectionQueries.workingRanges(ids));
  const blocks = useQuery({
    ...inspectionQueries.blocks(ids, from.toISOString(), to.toISOString()),
    placeholderData: keepPreviousData,
  });
  const assign = useAssignInspector();
  const unassign = useUnassignInspector();
  const [notice, setNotice] = useState<Notice | null>(null);
  const queuePanel = useStoredFlag(QUEUE_HIDDEN_STORAGE_KEY);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_DISTANCE } }),
    useSensor(KeyboardSensor),
  );
  const queue = unassigned.data ?? [];
  const items = (schedule.data ?? []).filter(
    (item) =>
      !search.inspector || item.inspector_id === search.inspector || item.inspector_id === null,
  );
  const dragged =
    items.find((item) => item.id === draggedId) ?? queue.find((item) => item.id === draggedId);
  const draggedFromQueue = queue.find((item) => item.id === draggedId);
  const picked = queue.find((item) => item.id === search.pick);
  const pickedOnBoard =
    picked && view === 'day' && dateKey(new Date(picked.starts_at)) === date ? picked : undefined;
  const cities = Array.from(
    new Map(
      (allInspectors.data ?? []).map((inspector) => [inspector.city_id, inspector.city_name]),
    ),
    ([id, name]) => ({ id, name }),
  );
  const names = new Map(
    (allInspectors.data ?? []).map((inspector) => [inspector.user_id, inspector.full_name ?? '']),
  );
  const selected =
    (schedule.data ?? []).find((item) => item.id === search.sheet) ??
    queue.find((item) => item.id === search.sheet);
  const dateLabel =
    view === 'day'
      ? formatDate(from, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
      : t('schedule.week.range', {
          from: formatDate(from, { day: 'numeric', month: 'short' }),
          to: formatDate(addDays(to, -1), { day: 'numeric', month: 'short', year: 'numeric' }),
        });

  const openSheet = (inspectionId: string) => {
    void navigate({
      search: (previous) => ({ ...previous, sheet: inspectionId, mode: undefined }),
    });
  };

  const handlePick = (inspection: AdminInspection) => {
    setNotice(null);
    if (inspection.id === search.pick) {
      void navigate({ search: (previous) => ({ ...previous, pick: undefined }) });
      return;
    }
    void navigate({
      search: (previous) => ({
        ...previous,
        view: 'day',
        date: dateKey(new Date(inspection.starts_at)),
        city: inspection.city_id,
        inspector: undefined,
        pick: inspection.id,
      }),
    });
  };

  const assignTo = (inspection: AdminInspection, inspectorId: string) => {
    const name = names.get(inspectorId) ?? '';
    setNotice(null);
    assign.mutate(
      { inspectionId: inspection.id, inspectorId },
      {
        onSuccess: () => {
          setNotice({
            kind: 'assigned',
            inspectionId: inspection.id,
            previousInspectorId: inspection.inspector_id,
            text: t('schedule.assigned', { number: inspection.number, name }),
          });
          if (inspection.id === search.pick) {
            void navigate({ search: (previous) => ({ ...previous, pick: undefined }) });
          }
        },
        onError: (error) => {
          setNotice({
            kind: 'conflict',
            title: t('schedule.conflict.title', { name }),
            text: errorMessage(error),
          });
        },
      },
    );
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggedId(null);
    const inspection =
      items.find((item) => item.id === active.id) ?? queue.find((item) => item.id === active.id);
    if (!over || !inspection || inspection.inspector_id === over.id) {
      return;
    }
    assignTo(inspection, String(over.id));
  };

  const isLoading = schedule.isPending || inspectors.isPending || unassigned.isPending;
  const boardTitle = (
    <span className="flex flex-wrap items-center gap-2">
      {queuePanel.isOn ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="touch-target"
          onClick={queuePanel.toggle}
        >
          <PanelLeftOpenIcon aria-hidden />
          {t('schedule.queue.show', { count: queue.length })}
        </Button>
      ) : null}
      <ScheduleDateNav
        date={date}
        label={dateLabel}
        onDateChange={(next) => {
          void navigate({ search: (previous) => ({ ...previous, date: next, pick: undefined }) });
        }}
        onShift={(direction) => {
          void navigate({
            search: (previous) => ({
              ...previous,
              date: shiftScheduleDate(date, view, direction),
              pick: undefined,
            }),
          });
        }}
        onToday={() => {
          void navigate({
            search: (previous) => ({ ...previous, date: undefined, pick: undefined }),
          });
        }}
      />
    </span>
  );
  const boardToolbar = (
    <ScheduleFilters
      view={view}
      inspectors={inspectors.data ?? []}
      cities={cities}
      inspectorId={search.inspector}
      cityId={search.city}
      onViewChange={(next) => {
        void navigate({ search: (previous) => ({ ...previous, view: next, pick: undefined }) });
      }}
      onInspectorChange={(inspector) => {
        void navigate({ search: (previous) => ({ ...previous, inspector, pick: undefined }) });
      }}
      onCityChange={(city) => {
        void navigate({
          search: (previous) => ({ ...previous, city, inspector: undefined, pick: undefined }),
        });
      }}
      onReset={() => {
        void navigate({
          search: (previous) => ({
            ...previous,
            city: undefined,
            inspector: undefined,
            pick: undefined,
          }),
        });
      }}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {notice?.kind === 'conflict' ? (
        <Alert tone="error">
          <AlertTitle>{notice.title}</AlertTitle>
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      ) : null}
      {notice?.kind === 'assigned' ? (
        <InlineToast
          tone="success"
          message={notice.text}
          action={{
            label: t('schedule.undo'),
            onAction: () => {
              if (notice.previousInspectorId) {
                assign.mutate({
                  inspectionId: notice.inspectionId,
                  inspectorId: notice.previousInspectorId,
                });
              } else {
                unassign.mutate(notice.inspectionId);
              }
              setNotice(null);
            },
          }}
        />
      ) : null}
      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => {
          setDraggedId(String(active.id));
        }}
        onDragCancel={() => {
          setDraggedId(null);
        }}
        onDragEnd={handleDragEnd}
        accessibility={{
          screenReaderInstructions: { draggable: t('schedule.dnd.instructions') },
        }}
      >
        <div
          className={cn(
            'grid items-start gap-4',
            !queuePanel.isOn &&
              'lg:grid-cols-[220px_minmax(0,1fr)] lg:items-stretch xl:grid-cols-[260px_minmax(0,1fr)]',
          )}
        >
          {queuePanel.isOn ? null : (
            <aside className="relative min-w-0">
              <div className="flex flex-col lg:absolute lg:inset-0">
                {unassigned.isPending ? (
                  <Skeleton className="h-60 rounded-lg" />
                ) : (
                  <ScheduleQueue
                    inspections={queue}
                    cityId={search.queueCity}
                    day={search.queueDate}
                    onCityChange={(queueCity) => {
                      void navigate({
                        search: (previous) => ({ ...previous, queueCity, queueDate: undefined }),
                      });
                    }}
                    onDayChange={(queueDate) => {
                      void navigate({ search: (previous) => ({ ...previous, queueDate }) });
                    }}
                    pickedId={search.pick}
                    draggableDay={view === 'day' ? date : undefined}
                    onPick={handlePick}
                    onOpen={openSheet}
                    onHide={queuePanel.toggle}
                  />
                )}
              </div>
            </aside>
          )}
          {isLoading ? (
            <Skeleton className="h-130 rounded-lg" />
          ) : view === 'day' ? (
            <ScheduleDayBoard
              day={dayStart(date)}
              title={boardTitle}
              toolbar={boardToolbar}
              inspectors={shown}
              inspections={items}
              ranges={ranges.data ?? []}
              blocks={blocks.data ?? []}
              dragged={dragged}
              picked={draggedId === null ? pickedOnBoard : undefined}
              isAssigning={assign.isPending}
              onAssign={assignTo}
              onOpen={openSheet}
            />
          ) : (
            <ScheduleWeekBoard
              start={from}
              title={boardTitle}
              toolbar={boardToolbar}
              subtitle={
                search.city
                  ? (cities.find((city) => city.id === search.city)?.name ?? '')
                  : t('schedule.week.allCities')
              }
              inspectors={shown}
              inspections={items}
              ranges={ranges.data ?? []}
              today={today}
              onOpen={openSheet}
            />
          )}
        </div>
        <DragOverlay dropAnimation={null}>
          {draggedFromQueue ? <QueueDragPreview inspection={draggedFromQueue} /> : null}
        </DragOverlay>
      </DndContext>
      {selected ? (
        <AdminAppointmentDrawer
          inspection={selected}
          mode={search.mode}
          onModeChange={(mode) => {
            void navigate({ search: (previous) => ({ ...previous, mode }), replace: true });
          }}
          onClose={() => {
            void navigate({
              search: (previous) => ({ ...previous, sheet: undefined, mode: undefined }),
            });
          }}
        />
      ) : null}
    </div>
  );
}

const TIME = { hour: '2-digit', minute: '2-digit' } as const;

function QueueDragPreview({ inspection }: { inspection: AdminInspection }) {
  const { t } = useTranslation('inspections');

  return (
    <div className="flex w-60 cursor-grabbing flex-col gap-0.5 rounded-md border-2 border-primary bg-card px-3 py-2.5 shadow-lg">
      <strong className="text-small tabular-nums">
        {t('schedule.range', {
          from: formatDate(inspection.starts_at, TIME),
          to: formatDate(inspection.ends_at, TIME),
        })}
      </strong>
      <span className="truncate text-small font-bold">{inspection.address_text}</span>
    </div>
  );
}
