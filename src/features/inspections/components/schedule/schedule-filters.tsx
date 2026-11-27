import { RotateCcwIcon } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchSelect } from '@/components/forms/search-select';
import { SegmentedControl } from '@/components/forms/segmented-control';
import { Button } from '@/components/ui/button';
import { SCHEDULE_VIEWS, type AdminInspector, type ScheduleView } from '../../inspection.types';
import { CityFilterSelect } from './city-filter-select';
import { ScheduleFilterField } from './schedule-filter-field';

const ALL = 'all';

type ScheduleFiltersProps = {
  view: ScheduleView;
  inspectors: readonly AdminInspector[];
  cities: readonly { id: string; name: string }[];
  inspectorId: string | undefined;
  cityId: string | undefined;
  onViewChange: (view: ScheduleView) => void;
  onInspectorChange: (inspectorId: string | undefined) => void;
  onCityChange: (cityId: string | undefined) => void;
  onReset: () => void;
};

export function ScheduleFilters({
  view,
  inspectors,
  cities,
  inspectorId,
  cityId,
  onViewChange,
  onInspectorChange,
  onCityChange,
  onReset,
}: ScheduleFiltersProps) {
  const { t } = useTranslation('inspections');

  const cityPickerId = useId();
  const inspectorPickerId = useId();

  return (
    <div className="flex flex-wrap items-end gap-3">
      <ScheduleFilterField label={t('schedule.toolbar.view')}>
        <SegmentedControl
          options={SCHEDULE_VIEWS.map((option) => ({
            value: option,
            label: t(`schedule.toolbar.views.${option}`),
          }))}
          value={view}
          onChange={onViewChange}
          ariaLabel={t('schedule.toolbar.view')}
          size="control"
        />
      </ScheduleFilterField>
      <ScheduleFilterField
        label={t('schedule.toolbar.city')}
        htmlFor={cityPickerId}
        className="w-48"
      >
        <CityFilterSelect
          id={cityPickerId}
          cities={cities}
          value={cityId}
          onChange={onCityChange}
        />
      </ScheduleFilterField>
      <ScheduleFilterField
        label={t('schedule.toolbar.inspector')}
        htmlFor={inspectorPickerId}
        className="w-56"
      >
        <SearchSelect
          id={inspectorPickerId}
          value={inspectorId ?? ALL}
          options={[
            { value: ALL, label: t('schedule.toolbar.allInspectors') },
            ...inspectors.map((inspector) => ({
              value: inspector.user_id,
              label: inspector.full_name ?? '',
            })),
          ]}
          onChange={(value) => {
            onInspectorChange(value === ALL ? undefined : value);
          }}
          placeholder={t('schedule.toolbar.allInspectors')}
          searchPlaceholder={t('schedule.availability.search')}
          emptyText={t('schedule.availability.noMatch')}
        />
      </ScheduleFilterField>
      {cityId || inspectorId ? (
        <Button
          type="button"
          variant="ghost"
          size="md"
          className="touch-target text-brand"
          onClick={onReset}
        >
          <RotateCcwIcon aria-hidden />
          {t('schedule.resetFilters')}
        </Button>
      ) : null}
    </div>
  );
}
