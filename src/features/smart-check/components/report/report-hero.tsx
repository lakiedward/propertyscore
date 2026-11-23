import { CheckIcon, DatabaseIcon, InfoIcon, LayersIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { MapMarkerItem, MapOverlay } from '@/components/map/map-canvas';
import { AddressPin } from '@/components/report/address-pin';
import { ReportMap } from '@/components/report/report-map';
import { boundsAround, ringAround } from '@/components/report/report-map.utils';
import { scoreBand } from '@/components/report/score-bands';
import { ScoreValue } from '@/components/trust/score-value';
import { formatDate, formatNumber } from '@/i18n/format';
import { addressLabel, areaCollection, reportCenter } from '../../report-map.utils';
import {
  analysisRadiusKm,
  scoredCategories,
  strongestCategories,
  weakestCategory,
} from '../../report-summary.utils';
import type { ReadyReport } from '../../report.types';
import { ReportHeroActions } from './report-hero-actions';
import { useRegisterReportHero } from './report-hero-context';

const HERO_MAP_RADIUS_M = 625;
const HERO_RING_RADIUS_M = 500;
const DATE_FORMAT = { day: 'numeric', month: 'short', year: 'numeric' } as const;

type ReportHeroProps = {
  report: ReadyReport;
  shareToken?: string;
};

export function ReportHero({ report, shareToken }: ReportHeroProps) {
  const { t } = useTranslation('smartCheck');
  useRegisterReportHero();
  const { result } = report;
  const scored = scoredCategories(result);
  const [first, second] = strongestCategories(scored);
  const weak = weakestCategory(scored);
  const zoneScore = result.zone.score === null ? null : Math.round(result.zone.score);
  const center = reportCenter(report);
  const green = result.sections.green;

  const strengthsLead =
    first && second
      ? t('report.frame.hero.leadTwoStrengths', {
          first: t(`report.categories.${first.key}.strength`),
          second: t(`report.categories.${second.key}.strength`),
        })
      : first
        ? t('report.frame.hero.leadOneStrength', {
            first: t(`report.categories.${first.key}.strength`),
          })
        : t('report.frame.hero.leadNoStrengths');
  const weakLead = weak
    ? t('report.frame.hero.leadWeak', { weak: t(`report.categories.${weak.key}.weakness`) })
    : t('report.frame.hero.leadNoWeak');

  const overlays: MapOverlay[] = [
    {
      id: 'hero-green',
      kind: 'fill',
      colorToken: '--report-map-green-area',
      opacity: 0.75,
      outlineWidth: 1,
      isVisible: true,
      data: areaCollection(green?.areas.features.map((feature) => feature.geometry) ?? []),
    },
    {
      id: 'hero-ring',
      kind: 'line',
      colorToken: '--report-green',
      width: 1.5,
      isVisible: true,
      data: ringAround(center, HERO_RING_RADIUS_M),
    },
  ];

  const markers: MapMarkerItem[] = [
    {
      id: 'address',
      position: center,
      anchor: 'bottom',
      node: <AddressPin label={addressLabel(report.address_text)} />,
    },
  ];

  return (
    <section aria-labelledby="report-title" className="bg-report-hero text-on-inverse">
      <div className="mx-auto grid max-w-report items-center gap-9 px-4 pt-7 pb-10 w560:pt-14 w560:pb-18 w1080:grid-cols-[minmax(0,1fr)_minmax(0,640px)] w1080:gap-14">
        <div className="flex min-w-0 flex-col gap-4">
          <p className="text-caption font-bold tracking-label text-cta uppercase">
            {t('report.frame.hero.eyebrow', {
              number: report.number,
              date: formatDate(report.generated_at ?? report.created_at, DATE_FORMAT),
            })}
          </p>
          <h1
            id="report-title"
            className="text-[clamp(34px,4vw,52px)] leading-[1.06] font-extrabold tracking-[-0.034em]"
          >
            {report.address_text}
          </h1>
          <p className="max-w-[34em] text-lead-sm text-on-info-soft w560:text-lead w560:leading-copy">
            {strengthsLead} {weakLead}
          </p>
          <p className="inline-flex items-center gap-2 text-small text-on-info-soft">
            <DatabaseIcon aria-hidden className="size-4 shrink-0" />
            {t('report.frame.hero.meta', {
              date: formatDate(result.snapshot.period, DATE_FORMAT),
              radius: formatNumber(analysisRadiusKm(result), { maximumFractionDigits: 1 }),
            })}
          </p>
          <ul className="flex flex-wrap gap-2">
            <HeroFact icon={<CheckIcon aria-hidden className="size-4 text-cta" />}>
              {t('report.frame.hero.ready')}
            </HeroFact>
            <HeroFact icon={<InfoIcon aria-hidden className="size-4" />}>
              {report.declared_area_m2 === null
                ? t('report.frame.hero.noDetails')
                : t('report.frame.hero.declaredArea', {
                    area: formatNumber(report.declared_area_m2),
                  })}
            </HeroFact>
          </ul>
          <ReportHeroActions report={report} shareToken={shareToken} />
        </div>
        <div className="relative min-w-0 pt-4 pr-3.5 w560:pt-7.5 w560:pr-7.5">
          <span
            aria-hidden="true"
            className="absolute top-0 right-0 h-[88%] w-[86%] rounded-[28px] bg-report-hero-offset"
          />
          <div className="relative h-75 overflow-hidden rounded-2xl shadow-report-map w560:h-110 w560:rounded-photo">
            <ReportMap
              label={t('report.frame.hero.mapTitle')}
              errorLabel={t('report.frame.hero.mapError')}
              center={center}
              zoom={15}
              bounds={boundsAround(center, HERO_MAP_RADIUS_M)}
              boundsPadding={0}
              overlays={overlays}
              markers={markers}
            />
            <p className="absolute top-3 left-3 z-3 inline-flex items-center gap-1.5 rounded-thumb bg-card/94 px-2.75 py-1.75 text-[12.5px] font-bold text-brand shadow-report-label w560:top-auto w560:bottom-3.5 w560:left-3.5">
              <LayersIcon aria-hidden className="size-3.5" />
              {t('report.frame.hero.mapLabel')}
            </p>
          </div>
          <div className="relative z-3 mx-3 -mt-11.5 flex items-center gap-3 rounded-[18px] bg-card py-3 pr-3.5 pl-3 text-foreground shadow-report-float w560:absolute w560:top-16.5 w560:-left-2.5 w560:m-0 w560:max-w-82.5 w560:gap-4 w560:py-4 w560:pr-5.5 w560:pl-4 w1080:-left-9">
            {zoneScore === null ? (
              <strong className="text-title-xs font-extrabold">
                {t('report.frame.hero.noScore')}
              </strong>
            ) : (
              <>
                <ScoreValue
                  variant="stroke"
                  size="report"
                  hue="report"
                  value={zoneScore}
                  label={t('report.frame.hero.zoneScoreLabel', { score: zoneScore })}
                  caption={t('report.frame.outOf')}
                  className="size-19 shrink-0 w560:size-21"
                />
                <div className="flex flex-col gap-0.75">
                  <p className="text-meta font-extrabold tracking-label text-report-hero uppercase">
                    {t('report.frame.hero.zoneScore')}
                  </p>
                  <strong className="text-[20px] leading-[1.1] font-extrabold tracking-[-0.02em] w560:text-[24px]">
                    {t(`report.bands.${scoreBand(zoneScore)}`)}
                  </strong>
                  <small className="text-caption leading-[1.4] text-muted-foreground">
                    {result.zone.city_avg === null
                      ? null
                      : t('report.frame.hero.zoneAverage', {
                          average: Math.round(result.zone.city_avg),
                        })}{' '}
                    {result.zone.city_max === null || result.zone.city_max === undefined
                      ? null
                      : t('report.frame.hero.zoneBest', {
                          best: Math.round(result.zone.city_max),
                        })}
                  </small>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

type HeroFactProps = {
  icon: ReactNode;
  children: ReactNode;
};

function HeroFact({ icon, children }: HeroFactProps) {
  return (
    <li className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-on-inverse/12 px-3 text-small font-semibold text-on-inverse">
      {icon}
      {children}
    </li>
  );
}
