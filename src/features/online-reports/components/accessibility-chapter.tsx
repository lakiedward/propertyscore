import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import type { ScoredAccessibilitySection } from '../online-report.types';
import { categoryClasses } from './category-style';
import { ChapterFacts } from './chapter-facts';
import { ChapterLimits } from './chapter-limits';
import { ChapterPanel } from './chapter-panel';
import { NoSectionData } from './no-section-data';
import { PlaceList } from './place-list';

const DESTINATIONS_TITLE_ID = 'accessibility-destinations-title';

type AccessibilityChapterProps = {
  section: ScoredAccessibilitySection | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function AccessibilityChapter({ section, selectedId, onSelect }: AccessibilityChapterProps) {
  const { t, i18n } = useTranslation('onlineReports');
  const hue = categoryClasses('accessibility');
  const limits = [t('accessibility.limits.schedule'), t('accessibility.limits.peak')];

  if (!section) {
    return (
      <div className="flex flex-col gap-5">
        <NoSectionData text={t('accessibility.noData')} />
        <ChapterLimits items={limits} />
      </div>
    );
  }

  const isEnglish = i18n.resolvedLanguage === 'en';
  const timed = section.destinations.flatMap((item) =>
    item.minutes === null ? [] : [item.minutes],
  );
  const average =
    timed.length === 0
      ? null
      : Math.round(timed.reduce((sum, value) => sum + value, 0) / timed.length);
  const facts = [
    {
      key: 'stops',
      value: formatNumber(section.stops.length),
      label: t('accessibility.facts.stops'),
    },
    {
      key: 'routes',
      value: formatNumber(section.routes.length),
      label: t('accessibility.facts.routes'),
    },
    {
      key: 'average',
      value: average === null ? '–' : t('accessibility.minutes', { count: average }),
      label: t('accessibility.facts.average'),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <ChapterFacts toneClassName={hue.tile} facts={facts} />
      {section.destinations.length > 0 ? (
        <ChapterPanel
          id={DESTINATIONS_TITLE_ID}
          title={t('accessibility.destinations.title')}
          lead={t('accessibility.destinations.lead')}
        >
          <PlaceList
            labelledBy={DESTINATIONS_TITLE_ID}
            hueKey="accessibility"
            selectedId={selectedId}
            onSelect={onSelect}
            items={section.destinations.map((item) => ({
              id: item.id,
              title: isEnglish ? item.label.en : item.label.ro,
              trailing:
                item.minutes === null
                  ? t('accessibility.destinations.unreachable')
                  : t('accessibility.minutes', { count: Math.round(item.minutes) }),
              details: [
                item.by_walking
                  ? t('accessibility.destinations.walking')
                  : item.route
                    ? t('accessibility.destinations.route', {
                        mode: t(`accessibility.mode.${item.route.mode}`),
                        ref: item.route.ref ?? '',
                      })
                    : t('accessibility.destinations.noRoute'),
                ...(item.transfers !== null && item.transfers > 0
                  ? [t('accessibility.destinations.transfers', { count: item.transfers })]
                  : []),
              ],
            }))}
          />
          <p className="text-meta text-muted-foreground">{t('accessibility.destinations.note')}</p>
        </ChapterPanel>
      ) : null}
      <ChapterPanel
        id="accessibility-stops-title"
        title={t('accessibility.stops.title')}
        lead={t('accessibility.stops.lead')}
      >
        {section.stops.length === 0 ? (
          <p className="rounded-lg bg-surface-sunken p-4 text-small">
            {t('accessibility.stops.none')}
          </p>
        ) : (
          <ul
            aria-labelledby="accessibility-stops-title"
            className="flex flex-col divide-y divide-border"
          >
            {section.stops.map((stop) => (
              <li
                key={stop.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2.5"
              >
                <span className="flex flex-col">
                  <span className="font-bold">{stop.name ?? t('accessibility.stops.unnamed')}</span>
                  <span className="text-meta text-muted-foreground">{stop.routes.join(' · ')}</span>
                </span>
                <span className="text-small font-bold tabular-nums">
                  {t('accessibility.minutes', { count: Math.max(1, Math.round(stop.walk_min)) })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ChapterPanel>
      {section.routes.length > 0 ? (
        <ChapterPanel id="accessibility-routes-title" title={t('accessibility.routes.title')}>
          <ul aria-labelledby="accessibility-routes-title" className="flex flex-wrap gap-2">
            {section.routes.map((route) => (
              <li
                key={route.key}
                className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-small"
              >
                <span
                  className={cn(
                    'rounded-sm px-1.5 py-0.5 text-meta font-extrabold',
                    route.colour ? undefined : hue.tile,
                  )}
                  style={
                    route.colour
                      ? { backgroundColor: route.colour, color: route.text_colour ?? undefined }
                      : undefined
                  }
                >
                  {route.ref ?? t(`accessibility.mode.${route.mode}`)}
                </span>
                <span className="text-muted-foreground">
                  {route.peak_per_hour === null
                    ? t(`accessibility.mode.${route.mode}`)
                    : t('accessibility.routes.peak', {
                        count: Math.round(route.peak_per_hour),
                      })}
                </span>
              </li>
            ))}
          </ul>
        </ChapterPanel>
      ) : null}
      <ChapterLimits
        items={[
          ...limits,
          ...(section.data_quality === 'osm_only' ? [t('accessibility.limits.partial')] : []),
        ]}
      />
    </div>
  );
}
