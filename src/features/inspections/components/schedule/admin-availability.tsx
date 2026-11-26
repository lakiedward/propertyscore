import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useId } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { SearchSelect } from '@/components/forms/search-select';
import { EmptyState } from '@/components/layout/empty-state';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AvailabilityEditor } from '@/features/staff';
import { inspectionQueries } from '../../api/inspections.queries';
import { CityFilterSelect } from './city-filter-select';
import { inspectorOption } from './inspector-option';

const route = getRouteApi('/_authenticated/admin/appointments');

export function AdminAvailability() {
  const { t } = useTranslation('inspections');
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const cityPickerId = useId();
  const inspectorPickerId = useId();
  const inspectors = useQuery(inspectionQueries.inspectors(null));

  if (inspectors.isPending) {
    return <Skeleton className="h-115 rounded-lg" />;
  }
  const all = inspectors.data ?? [];
  if (all.length === 0) {
    return (
      <EmptyState
        title={t('schedule.availability.empty.title')}
        description={t('schedule.availability.empty.text')}
      />
    );
  }
  const cities = Array.from(
    new Map(all.map((inspector) => [inspector.city_id, inspector.city_name])),
    ([id, name]) => ({ id, name }),
  );
  const city = cities.find((item) => item.id === search.city);
  const options = city ? all.filter((inspector) => inspector.city_id === city.id) : all;
  const selected =
    options.find((inspector) => inspector.user_id === search.inspector) ?? options[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-card bg-card p-4 shadow-card-soft md:flex-row md:items-center md:gap-6">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <Label htmlFor={cityPickerId} className="shrink-0 text-label">
            {t('schedule.availability.city')}
          </Label>
          <CityFilterSelect
            id={cityPickerId}
            cities={cities}
            value={city?.id}
            onChange={(cityId) => {
              void navigate({
                search: (previous) => ({ ...previous, city: cityId, inspector: undefined }),
              });
            }}
            className="sm:w-56"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <Label htmlFor={inspectorPickerId} className="shrink-0 text-label">
            {t('schedule.availability.inspector')}
          </Label>
          <SearchSelect
            id={inspectorPickerId}
            value={selected?.user_id ?? null}
            options={options.map((inspector) =>
              inspectorOption(
                inspector,
                inspector.is_active
                  ? inspector.city_name
                  : t('schedule.availability.inactiveCity', { city: inspector.city_name }),
              ),
            )}
            onChange={(inspectorId) => {
              void navigate({ search: (previous) => ({ ...previous, inspector: inspectorId }) });
            }}
            placeholder={t('schedule.availability.picker')}
            searchPlaceholder={t('schedule.availability.search')}
            emptyText={t('schedule.availability.noMatch')}
            className="sm:max-w-96"
          />
        </div>
      </div>
      {selected ? (
        <AvailabilityEditor
          key={selected.user_id}
          inspectorId={selected.user_id}
          description={
            <Trans
              t={t}
              i18nKey="schedule.availability.description"
              values={{ name: selected.full_name ?? '' }}
              components={{ name: <strong className="font-bold text-brand" /> }}
            />
          }
        />
      ) : null}
    </div>
  );
}
