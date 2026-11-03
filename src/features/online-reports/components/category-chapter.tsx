import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatPercent } from '@/i18n/format';
import { cn } from '@/lib/utils';
import {
  CHAPTER_CATEGORIES,
  isCityUniform,
  type CategoryKey,
  type CategorySummary,
  type ScoreChapterId,
} from '../online-report.utils';
import { categoryClasses } from './category-style';
import { CityDistribution } from './city-distribution';

type CategoryChapterProps = {
  chapter: ScoreChapterId;
  categories: Readonly<Record<CategoryKey, CategorySummary>>;
  cityName: string;
  totalWeight: number;
  details?: ReactNode;
  otherDetails?: Partial<Record<CategoryKey, ReactNode>>;
};

export function CategoryChapter({
  chapter,
  categories,
  cityName,
  totalWeight,
  details,
  otherDetails,
}: CategoryChapterProps) {
  const { t } = useTranslation('onlineReports');
  const [main, ...others] = CHAPTER_CATEGORIES[chapter];

  return (
    <div className="flex flex-col gap-5">
      {main === undefined ? null : (
        <CategoryDetail
          categoryKey={main}
          summary={categories[main]}
          cityName={cityName}
          totalWeight={totalWeight}
          headingLevel="h2"
        />
      )}
      {details}
      {others.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h3 className="text-eyebrow font-extrabold text-muted-foreground uppercase">
            {t('categoryChapter.alsoInChapter')}
          </h3>
          {others.map((key) => (
            <div key={key} className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <CategoryDetail
                categoryKey={key}
                summary={categories[key]}
                cityName={cityName}
                totalWeight={totalWeight}
                headingLevel="h4"
              />
              {otherDetails?.[key] ? <div className="pt-4">{otherDetails[key]}</div> : null}
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

type CategoryDetailProps = {
  categoryKey: CategoryKey;
  summary: CategorySummary;
  cityName: string;
  totalWeight: number;
  headingLevel: 'h2' | 'h4';
};

function CategoryDetail({
  categoryKey,
  summary,
  cityName,
  totalWeight,
  headingLevel: Heading,
}: CategoryDetailProps) {
  const { t } = useTranslation('onlineReports');
  const name = t(`category.${categoryKey}`);
  const hue = categoryClasses(categoryKey);
  const { score, percentile, city_avg: average, histogram, weight } = summary;
  const weightShare = totalWeight > 0 ? weight / totalWeight : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <span className={cn('text-eyebrow font-extrabold uppercase', hue.ink)}>
          {score === null
            ? t('categoryChapter.eyebrowMissing', { name })
            : t('categoryChapter.eyebrow', { name, score })}
        </span>
        <Heading className={cn('text-balance', Heading === 'h2' ? 'text-h2' : 'text-h4')}>
          {score === null || percentile === null
            ? t('categoryChapter.titleMissing')
            : isCityUniform(summary)
              ? t('categoryChapter.titleUniform', { city: cityName })
              : t('categoryChapter.title', {
                  percent: formatPercent(percentile / 100),
                  city: cityName,
                })}
        </Heading>
        <p className="text-lead-sm text-muted-foreground">
          {score === null ? t('categoryChapter.leadMissing') : t(`method.${categoryKey}`)}
        </p>
      </div>
      {score === null ? null : (
        <>
          <dl className="grid gap-2.5 sm:grid-cols-3">
            <Fact
              value={formatNumber(score)}
              label={t('categoryChapter.factScore')}
              toneClassName={hue.tile}
            />
            <Fact
              value={average === null ? '–' : formatNumber(average)}
              label={t('categoryChapter.factAverage')}
              toneClassName="bg-surface-sunken"
            />
            <Fact
              value={formatPercent(weightShare)}
              label={t('categoryChapter.factWeight')}
              toneClassName="bg-surface-sunken"
            />
          </dl>
          {histogram.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:p-6">
              <p className="text-body-sm font-bold">{t('categoryChapter.distribution')}</p>
              <CityDistribution
                name={name}
                cityName={cityName}
                score={score}
                histogram={histogram}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

type FactProps = {
  value: string;
  label: string;
  toneClassName: string;
};

function Fact({ value, label, toneClassName }: FactProps) {
  return (
    <div className={cn('flex flex-col-reverse gap-1 rounded-lg p-4', toneClassName)}>
      <dt className="text-small text-foreground">{label}</dt>
      <dd className="text-title-sm leading-tight font-extrabold tracking-[-0.025em] tabular-nums">
        {value}
      </dd>
    </div>
  );
}
