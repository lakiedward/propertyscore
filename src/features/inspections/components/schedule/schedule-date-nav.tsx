import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '@/components/forms/date-picker';
import { Button } from '@/components/ui/button';

type ScheduleDateNavProps = {
  date: string;
  label: string;
  onDateChange: (date: string) => void;
  onShift: (direction: 1 | -1) => void;
  onToday: () => void;
};

export function ScheduleDateNav({
  date,
  label,
  onDateChange,
  onShift,
  onToday,
}: ScheduleDateNavProps) {
  const { t } = useTranslation('inspections');

  return (
    <span className="flex flex-wrap items-center gap-1">
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
      <DatePicker look="title" value={date} label={label} onChange={onDateChange} />
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="touch-target ml-1"
        onClick={onToday}
      >
        {t('schedule.toolbar.today')}
      </Button>
    </span>
  );
}
