import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineToast } from '@/components/feedback/inline-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useErrorMessage } from '@/i18n/error-message';
import { formatDate } from '@/i18n/format';
import {
  inspectionQueries,
  useAssignInspector,
  useUnassignInspector,
} from '../../api/inspections.queries';
import type { ScheduleView } from '../../inspection.types';
import { dayStart, scheduleRange, shiftScheduleDate } from '../../schedule.utils';
import { addDays, dateKey } from '../../slots.utils';
import { AdminAppointmentDrawer } from './admin-appointment-drawer';
import { ScheduleDayBoard } from './schedule-day-board';
import { ScheduleQueue } from './schedule-queue';
import { ScheduleToolbar } from './schedule-toolbar';
import { ScheduleWeekBoard } from './schedule-week-board';

const route = getRouteApi('/_authenticated/admin/appointments');

const DRAG_DISTANCE = 6;

type Notice =
  | { kind: 'assigned'; inspectionId: string; text: string }
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
  const schedule = useQuery(
    inspectionQueries.schedule(from.toISOString(), to.toISOString(), cityId),
  );
  const unassigned = useQuery(inspectionQueries.unassigned(cityId));
  const inspectors = useQuery(inspectionQueries.inspectors(cityId));
  const allInspectors = useQuery(inspectionQueries.inspectors(null));
  const shown = (inspectors.data ?? []).filter(
    (inspector) => !search.inspector || inspector.user_id === search.inspector,
  );
  const ids = (inspectors.data ?? []).map((inspector) => inspector.user_id);
  const ranges = useQuery(inspectionQueries.workingRanges(ids));
  const blocks = useQuery(inspectionQueries.blocks(ids, from.toISOString(), to.toISOString()));
  const assign = useAssignInspector();
  const unassign = useUnassignInspector();
  const [notice, setNotice] = useState<Notice | null>(null);
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
  const dragged = queue.find((item) => item.id === draggedId);
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

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggedId(null);
    const inspection = queue.find((item) => item.id === active.id);
    if (!over || !inspection) {
      return;
    }
    const inspectorId = String(over.id);
    const name = names.get(inspectorId) ?? '';
    setNotice(null);
    assign.mutate(
      { inspectionId: inspection.id, inspectorId },
      {
        onSuccess: () => {
          setNotice({
            kind: 'assigned',
            inspectionId: inspection.id,
            text: t('schedule.assigned', { number: inspection.number, name }),
          });
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

  const isLoading = schedule.isPending || inspectors.isPending || unassigned.isPending;

  return (
    <div className="flex flex-col gap-4">
      <ScheduleToolbar
        view={view}
        dateLabel={dateLabel}
        inspectors={inspectors.data ?? []}
        cities={cities}
        inspectorId={search.inspector}
        cityId={search.city}
        onViewChange={(next) => {
          void navigate({ search: (previous) => ({ ...previous, view: next }) });
        }}
        onShift={(direction) => {
          void navigate({
            search: (previous) => ({ ...previous, date: shiftScheduleDate(date, view, direction) }),
          });
        }}
        onToday={() => {
          void navigate({ search: (previous) => ({ ...previous, date: undefined }) });
        }}
        onInspectorChange={(inspector) => {
          void navigate({ search: (previous) => ({ ...previous, inspector }) });
        }}
        onCityChange={(city) => {
          void navigate({ search: (previous) => ({ ...previous, city, inspector: undefined }) });
        }}
      />
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
              unassign.mutate(notice.inspectionId);
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
        <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="min-w-0 lg:sticky lg:top-24">
            {unassigned.isPending ? (
              <Skeleton className="h-60 rounded-lg" />
            ) : (
              <ScheduleQueue inspections={queue} isDraggable={view === 'day'} onOpen={openSheet} />
            )}
          </aside>
          {isLoading ? (
            <Skeleton className="h-130 rounded-lg" />
          ) : view === 'day' ? (
            <ScheduleDayBoard
              day={dayStart(date)}
              title={dateLabel}
              inspectors={shown}
              inspections={items}
              ranges={ranges.data ?? []}
              blocks={blocks.data ?? []}
              dragged={dragged}
              onOpen={openSheet}
            />
          ) : (
            <ScheduleWeekBoard
              start={from}
              title={dateLabel}
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
