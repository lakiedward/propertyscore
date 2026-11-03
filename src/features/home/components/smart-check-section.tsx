import { useId } from 'react';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { SmartCheckIntro } from './smart-check-intro';
import { SmartCheckSteps } from './smart-check-steps';
import { ZoneMapBand } from './zone-map-band';
import { ZoneReportTiles } from './zone-report-tiles';

export function SmartCheckSection() {
  const titleId = useId();

  return (
    <section id={HOME_SECTION.smartCheck} aria-labelledby={titleId}>
      <SmartCheckIntro titleId={titleId} />
      <ZoneReportTiles />
      <ZoneMapBand />
      <SmartCheckSteps />
    </section>
  );
}
