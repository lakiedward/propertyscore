import { CarIcon, FootprintsIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ScoredHealthSection } from '../online-report.types';
import { NoSectionData } from './no-section-data';

type HealthDetailsProps = {
  section: ScoredHealthSection | undefined;
};

export function HealthDetails({ section }: HealthDetailsProps) {
  const { t } = useTranslation('onlineReports');

  if (!section) return <NoSectionData text={t('health.noData')} />;

  return (
    <ul aria-label={t('health.layers.label')} className="flex flex-col divide-y divide-border">
      {section.layers.map((layer) => {
        const Icon = layer.mode === 'car' ? CarIcon : FootprintsIcon;
        return (
          <li
            key={layer.key}
            className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2.5"
          >
            <span className="flex flex-col">
              <span className="font-bold">{t(`health.layer.${layer.key}`)}</span>
              <span className="text-meta text-muted-foreground">
                {layer.place?.name ?? (layer.points === null ? t('health.noLayerData') : '')}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-small font-bold tabular-nums">
              {layer.minutes === null ? null : <Icon aria-hidden className="size-3.5" />}
              {layer.minutes === null
                ? t('health.notInReach')
                : layer.mode === 'car'
                  ? t('health.drive', { count: Math.round(layer.minutes) })
                  : t('health.walk', { count: Math.round(layer.minutes) })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
