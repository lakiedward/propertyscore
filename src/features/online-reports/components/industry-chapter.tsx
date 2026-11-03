import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/i18n/format';
import { useDistanceLabel } from '../hooks/use-distance-label';
import { useRadiusLabel } from '../hooks/use-radius-label';
import type { IndustrySection } from '../online-report.types';
import { categoryClasses } from './category-style';
import { ChapterFacts } from './chapter-facts';
import { ChapterLimits } from './chapter-limits';
import { ChapterPanel } from './chapter-panel';
import { NoSectionData } from './no-section-data';
import { PlaceList } from './place-list';

const SITES_TITLE_ID = 'industry-sites-title';

type IndustryChapterProps = {
  section: IndustrySection;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function verdictKey(section: IndustrySection) {
  if (section.count_radius === 0) return 'noneInRadius';
  if (section.count_near === 0) return 'noneNear';
  if (section.count_near === 1) return 'oneNear';
  return 'manyNear';
}

export function IndustryChapter({ section, selectedId, onSelect }: IndustryChapterProps) {
  const { t } = useTranslation('onlineReports');
  const radiusLabel = useRadiusLabel();
  const distanceLabel = useDistanceLabel();
  const hue = categoryClasses('industry');
  const year = section.source.reporting_year;
  const limits = [
    t('industry.limits.register'),
    t('industry.limits.smell'),
    ...(year === null ? [] : [t('industry.limits.year', { year })]),
  ];

  if (section.status === 'no_data') {
    return (
      <div className="flex flex-col gap-5">
        <NoSectionData text={t('industry.noData')} />
        <ChapterLimits items={limits} />
      </div>
    );
  }

  const radius = radiusLabel(section.radius_m);
  const near = radiusLabel(section.near_m);

  const facts = [
    {
      key: 'nearest',
      value: section.nearest_m === null ? '–' : distanceLabel(section.nearest_m),
      label: t('industry.facts.nearest'),
    },
    {
      key: 'radius',
      value: formatNumber(section.count_radius),
      label: t('industry.facts.inRadius', { radius }),
    },
    {
      key: 'near',
      value: formatNumber(section.count_near),
      label: t('industry.facts.near', { radius: near }),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <ChapterFacts toneClassName={hue.tile} facts={facts} />
      <ChapterPanel
        id={SITES_TITLE_ID}
        title={t(`industry.verdict.${verdictKey(section)}`, {
          radius,
          near,
          distance: section.nearest_m === null ? '' : distanceLabel(section.nearest_m),
        })}
        lead={t('industry.sites.lead')}
      >
        {section.sites.length === 0 ? (
          <p className="rounded-lg bg-surface-sunken p-4 text-small">
            {t('industry.sites.none', { radius })}
          </p>
        ) : (
          <PlaceList
            labelledBy={SITES_TITLE_ID}
            hueKey="industry"
            selectedId={selectedId}
            onSelect={onSelect}
            items={section.sites.map((site) => ({
              id: site.id,
              title: site.name,
              trailing: distanceLabel(site.distance_m),
              details: [
                t(`industry.sector.${site.sector_code}`),
                ...site.impact_codes.map((code) => t(`industry.impact.${code}`)),
                site.points_lost > 0
                  ? t('industry.sites.pointsLost', { count: Math.round(site.points_lost) })
                  : t('industry.sites.noPoints'),
              ],
            }))}
          />
        )}
      </ChapterPanel>
      <ChapterLimits items={limits} />
    </div>
  );
}
