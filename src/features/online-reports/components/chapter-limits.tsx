import { InfoIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ChapterLimitsProps = {
  items: readonly string[];
};

export function ChapterLimits({ items }: ChapterLimitsProps) {
  const { t } = useTranslation('onlineReports');

  return (
    <section
      aria-label={t('chapterLimits.title')}
      className="flex flex-col gap-2.5 rounded-xl bg-surface-sunken p-5 sm:p-6"
    >
      <p className="flex items-center gap-2 text-body-sm font-bold">
        <InfoIcon aria-hidden className="size-4 text-muted-foreground" />
        {t('chapterLimits.title')}
      </p>
      <ul className="flex list-disc flex-col gap-1.5 ps-5 text-small text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
