import { MinusIcon, PlusIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { useDistanceLabel } from '../hooks/use-distance-label';
import type { ScoredSafetySection } from '../online-report.types';
import type { DayMoment } from '../online-report.utils';
import { categoryClasses } from './category-style';
import { ChapterFacts } from './chapter-facts';
import { ChapterLimits } from './chapter-limits';
import { ChapterPanel } from './chapter-panel';
import { MomentToggle } from './moment-toggle';
import { NoSectionData } from './no-section-data';
import { PlaceList } from './place-list';

const LANDMARKS_TITLE_ID = 'safety-landmarks-title';

type SafetyChapterProps = {
  section: ScoredSafetySection | undefined;
  moment: DayMoment;
  onMomentChange: (moment: DayMoment) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function SafetyChapter({
  section,
  moment,
  onMomentChange,
  selectedId,
  onSelect,
}: SafetyChapterProps) {
  const { t } = useTranslation('onlineReports');
  const distanceLabel = useDistanceLabel();
  const hue = categoryClasses('safety');
  const limits = [t('safety.limits.proxy'), t('safety.limits.osm')];

  if (!section) {
    return (
      <div className="flex flex-col gap-5">
        <NoSectionData text={t('safety.noData')} />
        <ChapterLimits items={limits} />
      </div>
    );
  }

  const police = section.landmarks.find((landmark) => landmark.type === 'police');
  const atAddress = section.address[moment];
  const rows = atAddress.waterfall.filter((row) => row.key !== 'start' && row.points !== 0);
  const raising = rows.filter((row) => row.points > 0);
  const lowering = rows.filter((row) => row.points < 0);
  const signed = (points: number) => `${points > 0 ? '+' : '−'}${formatNumber(Math.abs(points))}`;
  const columns = [
    { id: 'raising', title: t('safety.why.raising'), items: raising, Icon: PlusIcon },
    { id: 'lowering', title: t('safety.why.lowering'), items: lowering, Icon: MinusIcon },
  ];
  const facts = [
    { key: 'day', value: formatNumber(section.day), label: t('safety.facts.day') },
    { key: 'night', value: formatNumber(section.night), label: t('safety.facts.night') },
    {
      key: 'police',
      value: police ? distanceLabel(police.distance_m) : '–',
      label: t('safety.facts.police'),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <ChapterFacts toneClassName={hue.tile} facts={facts} />
      <ChapterPanel
        id="safety-why-title"
        title={t('safety.why.title', { score: formatNumber(atAddress.score) })}
        lead={t('safety.why.lead', { start: formatNumber(section.address.start) })}
      >
        <MomentToggle
          value={moment}
          onValueChange={onMomentChange}
          labels={{
            day: t('safety.moment.day', { score: formatNumber(section.address.day.score) }),
            night: t('safety.moment.night', { score: formatNumber(section.address.night.score) }),
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {columns.map(({ id, title, items, Icon }) => (
            <div key={id} className="flex flex-col gap-1.5">
              <p className="text-body-sm font-bold">{title}</p>
              {items.length === 0 ? (
                <p className="text-small text-muted-foreground">{t('safety.why.none')}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {items.map((row) => (
                    <li
                      key={row.key}
                      className="flex items-center justify-between gap-3 text-small"
                    >
                      <span className="flex items-center gap-2">
                        <Icon
                          aria-hidden
                          className={cn(
                            'size-4 shrink-0',
                            row.points > 0 ? hue.ink : 'text-muted-foreground',
                          )}
                        />
                        {t(`safety.row.${row.key}`)}
                      </span>
                      <span className="font-bold tabular-nums">{signed(row.points)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </ChapterPanel>
      {section.landmarks.length > 0 ? (
        <ChapterPanel
          id={LANDMARKS_TITLE_ID}
          title={t('safety.landmarks.title')}
          lead={t('safety.landmarks.lead')}
        >
          <PlaceList
            labelledBy={LANDMARKS_TITLE_ID}
            hueKey="safety"
            selectedId={selectedId}
            onSelect={onSelect}
            items={section.landmarks.map((landmark) => ({
              id: landmark.id,
              title: landmark.name ?? t(`safety.row.${landmark.type}`),
              trailing: distanceLabel(landmark.distance_m),
              details: [t(`safety.row.${landmark.type}`)],
            }))}
          />
        </ChapterPanel>
      ) : null}
      <ChapterLimits items={limits} />
    </div>
  );
}
