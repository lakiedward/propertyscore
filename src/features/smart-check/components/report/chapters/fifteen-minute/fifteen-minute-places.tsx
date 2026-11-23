import { InfoIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FifteenMinuteKey } from './fifteen-minute-key';
import { FifteenMinuteChecklist } from './fifteen-minute-checklist';
import { FifteenMinuteMap } from './fifteen-minute-map';
import {
  WALK_LIMIT_MIN,
  formatSourceDate,
  walkMetersPerMinute,
  type FifteenMinuteSection,
} from '../../../../fifteen-minute.utils';
import type { ReadyReport } from '../../../../report.types';

type FifteenMinutePlacesProps = {
  report: ReadyReport;
  section: FifteenMinuteSection;
};

export function FifteenMinutePlaces({ report, section }: FifteenMinutePlacesProps) {
  const { t } = useTranslation('smartCheck');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const osmDate = report.result.snapshot.source_dates.osm;
  const speed = walkMetersPerMinute(section);
  const note = osmDate
    ? t('report.chapters.fifteenMinute.map.source', {
        date: formatSourceDate(osmDate),
        speed,
      })
    : t('report.chapters.fifteenMinute.map.sourceNoDate', { speed });

  return (
    <div>
      <section
        aria-label={t('report.chapters.fifteenMinute.map.panelLabel')}
        className="grid overflow-hidden rounded-icon border border-border bg-card w1059:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
      >
        <div className="relative h-[380px] min-h-[380px] w560:h-[460px] w1059:h-auto w1059:min-h-[640px]">
          <FifteenMinuteMap report={report} section={section} selectedKey={selectedKey} />
          <span className="pointer-events-none absolute top-2.5 left-2.5 z-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/96 px-3 py-1.5 text-meta font-bold shadow-report-label">
            <i aria-hidden="true" className="size-2 rounded-full bg-report-fifteen-minute" />
            {t('report.chapters.fifteenMinute.map.chip', { limit: WALK_LIMIT_MIN })}
          </span>
          <FifteenMinuteKey />
        </div>
        <aside className="max-h-none overflow-auto px-3.5 pt-4.5 pb-3.5 w560:px-5.5 w560:pt-5.5 w1059:max-h-[700px]">
          <FifteenMinuteChecklist
            section={section}
            selectedKey={selectedKey}
            onSelect={(key) => {
              setSelectedKey((current) => (current === key ? null : key));
            }}
          />
        </aside>
      </section>
      <p className="mt-2.5 flex gap-2 text-meta leading-[1.45] text-muted-foreground">
        <InfoIcon aria-hidden className="mt-0.5 size-3.75 shrink-0" />
        <span>{note}</span>
      </p>
    </div>
  );
}
