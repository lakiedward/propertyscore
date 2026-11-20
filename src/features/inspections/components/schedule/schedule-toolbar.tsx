import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { oneOf } from '@/lib/utils';
import { SCHEDULE_VIEWS, type AdminInspector, type ScheduleView } from '../../inspection.types';

const ALL = 'all';

type ScheduleToolbarProps = {
  view: ScheduleView;
  dateLabel: string;
  inspectors: readonly AdminInspector[];
  cities: readonly { id: string; name: string }[];
  inspectorId: string | undefined;
  cityId: string | undefined;
  onViewChange: (view: ScheduleView) => void;
  onShift: (direction: 1 | -1) => void;
  onToday: () => void;
  onInspectorChange: (inspectorId: string | undefined) => void;
  onCityChange: (cityId: string | undefined) => void;
};

export function ScheduleToolbar({
  view,
  dateLabel,
  inspectors,
  cities,
  inspectorId,
  cityId,
  onViewChange,
  onShift,
  onToday,
  onInspectorChange,
  onCityChange,
}: ScheduleToolbarProps) {
  const { t } = useTranslation('inspections');

  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-lg border border-card bg-card px-3.5 py-2.5 shadow-card-soft">
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
        className="gap-0 rounded-md border border-border bg-card p-0.75"
      >
        {SCHEDULE_VIEWS.map((option) => (
          <ToggleGroupItem
            key={option}
            value={option}
            className="touch-target h-7.5 rounded-[6px] px-3 text-caption font-semibold text-brand data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {t(`schedule.toolbar.views.${option}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('schedule.toolbar.previous')}
          onClick={() => {
            onShift(-1);
          }}
        >
          <ChevronLeftIcon aria-hidden />
        </Button>
        <strong className="px-1.5 text-body-sm whitespace-nowrap first-letter:uppercase">
          {dateLabel}
        </strong>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('schedule.toolbar.next')}
          onClick={() => {
            onShift(1);
          }}
        >
          <ChevronRightIcon aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="touch-target" onClick={onToday}>
          {t('schedule.toolbar.today')}
        </Button>
      </div>
      <div className="ml-auto flex flex-wrap gap-2.5">
        <Select
          value={inspectorId ?? ALL}
          onValueChange={(value) => {
            onInspectorChange(value === ALL ? undefined : value);
          }}
        >
          <SelectTrigger aria-label={t('schedule.toolbar.inspector')} className="w-47.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('schedule.toolbar.allInspectors')}</SelectItem>
            {inspectors.map((inspector) => (
              <SelectItem key={inspector.user_id} value={inspector.user_id}>
                {inspector.full_name ?? inspector.user_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={cityId ?? ALL}
          onValueChange={(value) => {
            onCityChange(value === ALL ? undefined : value);
          }}
        >
          <SelectTrigger aria-label={t('schedule.toolbar.city')} className="w-42.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('schedule.toolbar.allCities')}</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city.id} value={city.id}>
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
