import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { useDistanceLabel } from '../hooks/use-distance-label';
import type { NoiseSection } from '../online-report.types';
import type { DayMoment } from '../online-report.utils';
import { categoryClasses } from './category-style';
import { ChapterFacts } from './chapter-facts';
import { ChapterLimits } from './chapter-limits';
import { ChapterPanel } from './chapter-panel';
import { MomentToggle } from './moment-toggle';
import { NoSectionData } from './no-section-data';

const SCALE_MIN_DB = 35;
const SCALE_MAX_DB = 80;
type NoiseChapterProps = {
  section: NoiseSection;
  moment: DayMoment;
  onMomentChange: (moment: DayMoment) => void;
};

function scalePosition(level: number): string {
  const clamped = Math.min(SCALE_MAX_DB, Math.max(SCALE_MIN_DB, level));
  return `${String(((clamped - SCALE_MIN_DB) / (SCALE_MAX_DB - SCALE_MIN_DB)) * 100)}%`;
}

export function NoiseChapter({ section, moment, onMomentChange }: NoiseChapterProps) {
  const { t } = useTranslation('onlineReports');
  const hue = categoryClasses('noise');
  const distanceLabel = useDistanceLabel();
  const decibels = (value: number | null) =>
    value === null ? '–' : t('noise.decibels', { value: formatNumber(value) });
  const level = moment === 'day' ? section.lden : section.lnight;
  const guideline = moment === 'day' ? section.who.road.lden : section.who.road.lnight;
  const nearest = section.sources[0];

  if (section.status === 'no_data' || level === null) {
    return (
      <div className="flex flex-col gap-5">
        <NoSectionData text={t('noise.noData')} />
        <ChapterLimits items={[t('noise.limits.windows'), t('noise.limits.maps')]} />
      </div>
    );
  }

  const facts = [
    { key: 'lden', value: decibels(section.lden), label: t('noise.facts.lden') },
    { key: 'lnight', value: decibels(section.lnight), label: t('noise.facts.lnight') },
    {
      key: 'nearest',
      value: nearest ? distanceLabel(nearest.distance_m) : '–',
      label: nearest
        ? t('noise.facts.nearest', { source: t(`noise.kind.${nearest.kind}`) })
        : t('noise.facts.nearestNone'),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <ChapterFacts toneClassName={hue.tile} facts={facts} />
      <ChapterPanel
        id="noise-level-title"
        title={t('noise.level.title', { level: decibels(level) })}
        lead={
          section.precision === 'street'
            ? t('noise.level.leadStreet')
            : t('noise.level.leadEstimate')
        }
      >
        <MomentToggle value={moment} onValueChange={onMomentChange} />
        <figure className="flex flex-col gap-2">
          <div
            role="img"
            aria-label={t('noise.scale.label', {
              level: decibels(level),
              guideline: decibels(guideline),
            })}
            className="relative h-3 rounded-full bg-linear-to-r from-category-safety-surface to-category-safety"
          >
            <span
              aria-hidden
              style={{ left: scalePosition(guideline) }}
              className="absolute -top-1 h-5 w-0.5 -translate-x-1/2 bg-foreground/60"
            />
            <span
              aria-hidden
              style={{ left: scalePosition(level) }}
              className={cn(
                'absolute top-1/2 size-5 -translate-1/2 rounded-full border-3 border-card shadow-sm',
                hue.fill,
              )}
            />
          </div>
          <figcaption className="flex justify-between text-meta text-muted-foreground">
            <span>{decibels(SCALE_MIN_DB)}</span>
            <span>{t('noise.scale.guideline', { value: decibels(guideline) })}</span>
            <span>{decibels(SCALE_MAX_DB)}</span>
          </figcaption>
        </figure>
      </ChapterPanel>
      <ChapterPanel
        id="noise-sources-title"
        title={t('noise.sources.title')}
        lead={t('noise.sources.lead')}
      >
        {section.sources.length === 0 ? (
          <p className="rounded-lg bg-surface-sunken p-4 text-small">{t('noise.sources.none')}</p>
        ) : (
          <ul
            aria-labelledby="noise-sources-title"
            className="flex flex-col divide-y divide-border"
          >
            {section.sources.map((source) => (
              <li
                key={`${source.kind}-${source.name ?? ''}-${String(source.distance_m)}`}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2.5"
              >
                <span className="flex flex-col">
                  <span className="font-bold">{source.name ?? t(`noise.kind.${source.kind}`)}</span>
                  <span className="text-meta text-muted-foreground">
                    {t(`noise.kind.${source.kind}`)}
                    {source.lden_band
                      ? ` · ${t('noise.sources.band', {
                          low: formatNumber(source.lden_band[0]),
                          high:
                            source.lden_band[1] === null ? '+' : formatNumber(source.lden_band[1]),
                        })}`
                      : ''}
                  </span>
                </span>
                <span className="text-small font-bold tabular-nums">
                  {distanceLabel(source.distance_m)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ChapterPanel>
      <ChapterLimits
        items={[
          t('noise.limits.windows'),
          t('noise.limits.maps'),
          ...(section.method === 'osm_proxy' || section.method === 'mixed'
            ? [t('noise.limits.estimate')]
            : []),
        ]}
      />
    </div>
  );
}
