import { useTranslation } from 'react-i18next';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatNumber } from '@/i18n/format';
import { MODERATION_STATUSES, statusDotVariants } from '../moderation-status';
import type { ModerationCounts } from '../moderation.types';

type StatusTabsProps = {
  counts: ModerationCounts;
};

export function StatusTabs({ counts }: StatusTabsProps) {
  const { t } = useTranslation('moderation');

  return (
    <TabsList variant="pill" aria-label={t('tabs.label')}>
      {MODERATION_STATUSES.map((status) => (
        <TabsTrigger key={status} value={status} className="group/status">
          <span aria-hidden className={statusDotVariants({ status })} />
          {t(`tabs.${status}`)}
          <span className="grid h-5.5 min-w-5.5 place-items-center rounded-full bg-on-inverse/70 px-1.5 text-meta font-extrabold tabular-nums group-data-[state=active]/status:bg-background">
            {formatNumber(counts[status])}
          </span>
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
