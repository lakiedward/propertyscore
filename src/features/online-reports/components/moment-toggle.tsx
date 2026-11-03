import { useTranslation } from 'react-i18next';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DAY_MOMENTS, type DayMoment } from '../online-report.utils';

type MomentToggleProps = {
  value: DayMoment;
  onValueChange: (moment: DayMoment) => void;
  labels?: Partial<Record<DayMoment, string>>;
};

export function MomentToggle({ value, onValueChange, labels }: MomentToggleProps) {
  const { t } = useTranslation('onlineReports');

  return (
    <ToggleGroup
      type="single"
      size="sm"
      value={value}
      onValueChange={(next) => {
        const moment = DAY_MOMENTS.find((item) => item === next);
        if (moment) onValueChange(moment);
      }}
      aria-label={t('moment.label')}
      className="w-fit gap-1 rounded-full border border-border bg-surface-sunken p-1"
    >
      {DAY_MOMENTS.map((moment) => (
        <ToggleGroupItem
          key={moment}
          value={moment}
          className="h-8 rounded-full px-3 text-caption font-bold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {labels?.[moment] ?? t(`moment.${moment}`)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
