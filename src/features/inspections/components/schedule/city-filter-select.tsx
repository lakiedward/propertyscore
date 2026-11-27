import { useTranslation } from 'react-i18next';
import { SearchSelect } from '@/components/forms/search-select';

const ALL_CITIES = 'all';

type CityFilterSelectProps = {
  id: string;
  cities: readonly { id: string; name: string }[];
  value: string | undefined;
  onChange: (cityId: string | undefined) => void;
  className?: string;
};

export function CityFilterSelect({
  id,
  cities,
  value,
  onChange,
  className,
}: CityFilterSelectProps) {
  const { t } = useTranslation('inspections');

  return (
    <SearchSelect
      id={id}
      value={value ?? ALL_CITIES}
      options={[
        { value: ALL_CITIES, label: t('schedule.toolbar.allCities') },
        ...cities.map((city) => ({ value: city.id, label: city.name })),
      ]}
      onChange={(next) => {
        onChange(next === ALL_CITIES ? undefined : next);
      }}
      placeholder={t('schedule.toolbar.allCities')}
      searchPlaceholder={t('schedule.availability.citySearch')}
      emptyText={t('schedule.availability.noCity')}
      className={className}
    />
  );
}
