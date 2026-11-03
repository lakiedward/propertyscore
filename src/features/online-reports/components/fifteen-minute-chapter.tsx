import { CheckIcon, MinusIcon, XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { nearestPerGroup, placesWithin } from '../fifteen-minute-section.utils';
import type { FifteenMinuteSection } from '../online-report.types';
import { categoryClasses } from './category-style';
import { ChapterFacts } from './chapter-facts';
import { ChapterLimits } from './chapter-limits';
import { ChapterPanel } from './chapter-panel';
import { NoSectionData } from './no-section-data';
import { PlaceList } from './place-list';

const NEAREST_TITLE_ID = 'fifteen-minute-nearest-title';

type FifteenMinuteChapterProps = {
  section: FifteenMinuteSection;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function FifteenMinuteChapter({ section, selectedId, onSelect }: FifteenMinuteChapterProps) {
  const { t } = useTranslation('onlineReports');
  const hue = categoryClasses('fifteen_minute');
  const isApproximate = section.distance_method === 'straight_line';
  const limits = [
    t('fifteenMinute.limits.osm'),
    t('fifteenMinute.limits.hours'),
    ...(isApproximate ? [t('fifteenMinute.limits.approximate')] : []),
  ];

  if (section.status === 'no_data') {
    return (
      <div className="flex flex-col gap-5">
        <NoSectionData text={t('fifteenMinute.noData')} />
        <ChapterLimits items={limits} />
      </div>
    );
  }

  const minutes = (count: number) =>
    isApproximate
      ? t('fifteenMinute.walkApproximate', { count })
      : t('fifteenMinute.walk', { count });
  const missing = section.categories.filter((category) => category.status === 'missing');
  const nearest = nearestPerGroup(section);
  const facts = [
    {
      key: 'covered',
      value: t('fifteenMinute.facts.coveredValue', {
        covered: formatNumber(section.covered),
        total: formatNumber(section.total),
      }),
      label: t('fifteenMinute.facts.covered'),
    },
    {
      key: 'places',
      value: formatNumber(placesWithin(section)),
      label: t('fifteenMinute.facts.places'),
    },
    {
      key: 'missing',
      value: formatNumber(missing.length),
      label: t('fifteenMinute.facts.missing'),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <ChapterFacts toneClassName={hue.tile} facts={facts} />
      <ChapterPanel
        id="fifteen-minute-groups-title"
        title={t('fifteenMinute.groups.title', {
          covered: formatNumber(section.covered),
          total: formatNumber(section.total),
        })}
        lead={t('fifteenMinute.groups.lead')}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {section.groups
            .filter((group) => group.categories.length > 0)
            .map((group) => (
              <div key={group.key} className="flex flex-col gap-1.5">
                <p className="text-body-sm font-bold">{t(`fifteenMinute.group.${group.key}`)}</p>
                <ul className="flex flex-col gap-1">
                  {section.categories
                    .filter(
                      (category) => category.group === group.key && category.status !== 'no_data',
                    )
                    .map((category) => {
                      const isOk = category.status === 'ok';
                      const Icon = isOk ? CheckIcon : category.t1_min === null ? XIcon : MinusIcon;
                      return (
                        <li
                          key={category.key}
                          className="flex items-center justify-between gap-3 text-small"
                        >
                          <span className="flex items-center gap-2">
                            <Icon
                              aria-hidden
                              className={cn(
                                'size-4 shrink-0',
                                isOk ? hue.ink : 'text-muted-foreground',
                              )}
                            />
                            {t(`fifteenMinute.category.${category.key}`)}
                          </span>
                          <span
                            className={cn(
                              'tabular-nums',
                              isOk ? 'font-bold' : 'text-muted-foreground',
                            )}
                          >
                            {category.t1_min === null
                              ? t('fifteenMinute.notInReach')
                              : minutes(category.t1_min)}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
        </div>
      </ChapterPanel>
      {nearest.length > 0 ? (
        <ChapterPanel
          id={NEAREST_TITLE_ID}
          title={t('fifteenMinute.nearest.title')}
          lead={t('fifteenMinute.nearest.lead')}
        >
          <PlaceList
            labelledBy={NEAREST_TITLE_ID}
            hueKey="fifteen_minute"
            selectedId={selectedId}
            onSelect={onSelect}
            items={nearest.map((place) => ({
              id: place.id,
              title: place.name ?? t(`fifteenMinute.category.${place.category}`),
              trailing: minutes(place.minutes),
              details: [t(`fifteenMinute.category.${place.category}`)],
            }))}
          />
        </ChapterPanel>
      ) : null}
      <ChapterLimits items={limits} />
    </div>
  );
}
