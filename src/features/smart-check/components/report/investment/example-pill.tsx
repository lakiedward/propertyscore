import { useTranslation } from 'react-i18next';

export function ExamplePill() {
  const { t } = useTranslation('smartCheck');
  return (
    <span className="rounded-full border border-dashed border-warning-border bg-warning-surface px-2 py-px text-[10px] font-extrabold tracking-label text-warning uppercase">
      {t('report.chapters.investment.example')}
    </span>
  );
}
