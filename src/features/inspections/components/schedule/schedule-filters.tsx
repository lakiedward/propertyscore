import { RotateCcwIcon } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchSelect } from '@/components/forms/search-select';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { oneOf } from '@/lib/utils';
import { SCHEDULE_VIEWS, type AdminInspector, type ScheduleView } from '../../inspection.types';
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
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(value) => {
            const next = oneOf(SCHEDULE_VIEWS, value);
            if (next) {
              onViewChange(next);
            }
          }}
          aria-label={t('schedule.toolbar.view')}
          className="h-control gap-0 rounded-md border border-border bg-card p-0.75"
        >
          {SCHEDULE_VIEWS.map((option) => (
            <ToggleGroupItem
              key={option}
              value={option}
              className="touch-target h-full rounded-[6px] px-3.5 text-caption font-semibold text-brand data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {t(`schedule.toolbar.views.${option}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </ScheduleFilterField>
      <ScheduleFilterField
        label={t('schedule.toolbar.city')}
        htmlFor={cityPickerId}
        className="w-48"
      >
        <SearchSelect
          id={cityPickerId}
          value={cityId ?? ALL}
          options={[
            { value: ALL, label: t('schedule.toolbar.allCities') },
            ...cities.map((city) => ({ value: city.id, label: city.name })),
          ]}
          onChange={(value) => {
            onCityChange(value === ALL ? undefined : value);
          }}
          placeholder={t('schedule.toolbar.allCities')}
          searchPlaceholder={t('schedule.availability.citySearch')}
          emptyText={t('schedule.availability.noCity')}
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
