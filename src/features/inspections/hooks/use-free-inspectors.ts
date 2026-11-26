import { useQuery } from '@tanstack/react-query';
import { inspectionQueries } from '../api/inspections.queries';
import type { AdminInspection } from '../inspection.types';
import { assignmentClash, scheduleRange } from '../schedule.utils';
import { dateKey } from '../slots.utils';

export function useFreeInspectors(inspection: AdminInspection) {
  const { from, to } = scheduleRange(dateKey(new Date(inspection.starts_at)), 'day');
  const inspectors = useQuery(inspectionQueries.inspectors(inspection.city_id));
  const ids = (inspectors.data ?? []).map((inspector) => inspector.user_id);
  const ranges = useQuery({ ...inspectionQueries.workingRanges(ids), enabled: ids.length > 0 });
  const blocks = useQuery({
    ...inspectionQueries.blocks(ids, from.toISOString(), to.toISOString()),
    enabled: ids.length > 0,
  });
  const day = useQuery(
    inspectionQueries.schedule(from.toISOString(), to.toISOString(), inspection.city_id),
  );
  const isLoading = !inspectors.data || !ranges.data || !blocks.data || !day.data;
  const free = isLoading
    ? []
    : inspectors.data.filter(
        (inspector) =>
          inspector.user_id === inspection.inspector_id ||
          (inspector.is_active &&
            assignmentClash({
              inspection,
              inspectorId: inspector.user_id,
              assigned: day.data,
              ranges: ranges.data,
              blocks: blocks.data,
            }) === null),
      );

  return { free, isLoading };
}
