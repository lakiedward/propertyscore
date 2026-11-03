import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { binRange, histogramBin } from '../online-report.utils';

type CityDistributionProps = {
  name: string;
  cityName: string;
  score: number;
  histogram: readonly number[];
};

export function CityDistribution({ name, cityName, score, histogram }: CityDistributionProps) {
  const { t } = useTranslation('onlineReports');
  const highest = Math.max(1, ...histogram);
  const addressBin = histogramBin(score, histogram.length);
  const { from, to } = binRange(addressBin);

  return (
    <figure className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={t('categoryChapter.distributionLabel', { name, city: cityName, from, to })}
        className="flex h-24 items-end gap-0.5"
      >
        {histogram.map((count, bin) => (
          <span
            key={binRange(bin).from}
            className={cn(
              'min-h-0.5 flex-1 rounded-t-xs',
              bin === addressBin ? 'bg-info' : 'bg-info-border',
            )}
            style={{ height: `${String((count / highest) * 100)}%` } satisfies CSSProperties}
          />
        ))}
      </div>
      <div aria-hidden className="flex justify-between text-meta text-muted-foreground">
        <span>{t('categoryChapter.distributionAxisLow')}</span>
        <span>{t('categoryChapter.distributionAxisHigh')}</span>
      </div>
      <figcaption className="text-caption text-muted-foreground">
        {t('categoryChapter.distributionNote')}
      </figcaption>
    </figure>
  );
}
