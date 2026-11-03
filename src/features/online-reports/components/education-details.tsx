import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useDistanceLabel } from '../hooks/use-distance-label';
import type { ScoredEducationSection } from '../online-report.types';
import { categoryClasses } from './category-style';
import { NoSectionData } from './no-section-data';

type EducationDetailsProps = {
  section: ScoredEducationSection | undefined;
};

export function EducationDetails({ section }: EducationDetailsProps) {
  const { t } = useTranslation('onlineReports');
  const distanceLabel = useDistanceLabel();
  const hue = categoryClasses('education');

  if (!section) return <NoSectionData text={t('education.noData')} />;

  return (
    <div className="flex flex-col gap-4">
      <ul aria-label={t('education.levels.label')} className="grid gap-2.5 sm:grid-cols-3">
        {section.levels.map((level) => (
          <li key={level.key} className="flex flex-col gap-1 rounded-lg bg-surface-sunken p-3.5">
            <span className="text-small">{t(`education.level.${level.key}`)}</span>
            <span className="text-body font-extrabold tabular-nums">
              {level.nearest_min === null
                ? t('education.notInReach')
                : t('education.walk', { count: Math.round(level.nearest_min) })}
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-card">
              <span
                style={{ width: `${String(Math.round(level.points * 100))}%` }}
                className={cn('block h-full rounded-full', hue.fill)}
              />
            </span>
          </li>
        ))}
      </ul>
      {section.institutions.length > 0 ? (
        <ul
          aria-label={t('education.institutions.label')}
          className="flex flex-col divide-y divide-border"
        >
          {section.institutions.map((institution) => (
            <li
              key={institution.id}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2.5"
            >
              <span className="flex flex-col">
                <span className="font-bold">
                  {institution.name ?? t('education.institutions.unnamed')}
                </span>
                <span className="text-meta text-muted-foreground">
                  {t(`education.ownership.${institution.ownership}`)}
                </span>
              </span>
              <span className="text-small font-bold tabular-nums">
                {t('education.institutions.distance', {
                  distance: distanceLabel(institution.walk_m),
                })}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-meta text-muted-foreground">{t('education.note')}</p>
    </div>
  );
}
