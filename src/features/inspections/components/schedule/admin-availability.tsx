import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/layout/empty-state';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AvailabilityEditor } from '@/features/staff';
import { inspectionQueries } from '../../api/inspections.queries';

const route = getRouteApi('/_authenticated/admin/appointments');

export function AdminAvailability() {
  const { t } = useTranslation('inspections');
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const selectId = useId();
  const inspectors = useQuery(inspectionQueries.inspectors(null));

  if (inspectors.isPending) {
    return <Skeleton className="h-115 rounded-lg" />;
  }
  const options = inspectors.data ?? [];
  const selected =
    options.find((inspector) => inspector.user_id === search.inspector) ?? options[0];
  if (!selected) {
    return (
      <EmptyState
        kind="empty"
        variant="card"
        title={t('schedule.availability.empty.title')}
        description={t('schedule.availability.empty.text')}
      />
    );
  }

  return (
    <AvailabilityEditor
      key={selected.user_id}
      inspectorId={selected.user_id}
      inspectorName={selected.full_name?.split(' ')[0] ?? null}
      description={t('schedule.availability.description')}
      toolbar={
        <div className="flex w-full flex-col gap-1.5 sm:w-55">
          <Label htmlFor={selectId} className="text-label">
            {t('schedule.availability.inspector')}
          </Label>
          <Select
            value={selected.user_id}
            onValueChange={(value) => {
              void navigate({ search: (previous) => ({ ...previous, inspector: value }) });
            }}
          >
            <SelectTrigger id={selectId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((inspector) => (
                <SelectItem key={inspector.user_id} value={inspector.user_id}>
                  {inspector.full_name ?? inspector.user_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    />
  );
}
