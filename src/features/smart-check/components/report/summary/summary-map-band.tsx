import { MapIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { ReadyReport } from '../../../report.types';
import { ZONE_LAYERS, transitRoutes, walkRoutes } from '../../../zone-map.utils';
import { ZoneMap } from './zone-map';
import { ZoneMapExplorer } from './zone-map-explorer';

type SummaryMapBandProps = {
  report: ReadyReport;
};

export function SummaryMapBand({ report }: SummaryMapBandProps) {
  const { t, i18n } = useTranslation('smartCheck');
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const walk = walkRoutes(report.result);
  const transit = transitRoutes(report.result, i18n.resolvedLanguage === 'en' ? 'en' : 'ro');

  const stats = [
    { key: 'walk', value: walk.length },
    { key: 'transit', value: transit.length },
    { key: 'layers', value: ZONE_LAYERS.length },
  ] as const;

  return (
    <section
      aria-labelledby="summary-map-band"
      className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-report-map-land shadow-report-panel w760:block w760:h-120 w760:rounded-2xl"
    >
      <div className="relative order-first h-65 w760:absolute w760:inset-0 w760:h-auto">
        <ZoneMap report={report} routes={walk} layers={[]} className="rounded-none" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden bg-linear-to-r from-report-hero/94 via-report-hero/82 via-34% to-report-hero/0 to-62% w760:block"
      />
      <div className="relative z-3 bg-report-hero px-4.5 py-5.5 text-on-inverse w760:absolute w760:top-1/2 w760:left-10 w760:max-w-105 w760:-translate-y-1/2 w760:bg-transparent w760:p-0">
        <p className="text-meta font-extrabold tracking-label text-on-info-faint uppercase">
          {t('report.chapters.summary.mapBand.eyebrow')}
        </p>
        <h2
          id="summary-map-band"
          className="mt-2 text-[clamp(28px,3.2vw,42px)] leading-[1.06] font-extrabold tracking-[-0.03em]"
        >
          {t('report.chapters.summary.mapBand.title')}
        </h2>
        <p className="mt-2.5 text-body leading-normal text-on-info-muted">
          {t('report.chapters.summary.mapBand.text')}
        </p>
        <ul className="mt-4.5 mb-5.5 flex gap-4 w760:gap-5.5">
          {stats.map((stat) => (
            <li
              key={stat.key}
              className="max-w-[11ch] text-caption leading-[1.3] font-semibold text-on-info-faint"
            >
              <b className="block text-[26px] leading-none font-extrabold tracking-[-0.03em] text-cta w760:text-[30px]">
                {stat.value}
              </b>
              {t(`report.chapters.summary.mapBand.${stat.key}`)}
            </li>
          ))}
        </ul>
        <Button
          variant="cta"
          size="lg"
          className="w-full w760:w-auto"
          onClick={() => {
            setIsExplorerOpen(true);
          }}
        >
          <MapIcon aria-hidden className="size-4.5" />
          {t('report.chapters.summary.mapBand.open')}
        </Button>
      </div>
      <ZoneMapExplorer
        report={report}
        walk={walk}
        transit={transit}
        isOpen={isExplorerOpen}
        onOpenChange={setIsExplorerOpen}
      />
    </section>
  );
}
