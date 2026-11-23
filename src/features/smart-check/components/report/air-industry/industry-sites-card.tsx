import { useTranslation } from 'react-i18next';
import { formatDistanceM } from '../../../safety.utils';
import { sortedSites } from '../../../air-industry.utils';
import type { ReportResult } from '../../../report.types';

type IndustrySection = NonNullable<ReportResult['sections']['industry']>;

type IndustrySitesCardProps = {
  industry: IndustrySection;
};

const SECTORS = [
  'energy',
  'metals',
  'minerals',
  'chemicals',
  'waste_water',
  'paper_wood',
  'livestock',
  'food',
  'other',
] as const;
const IMPACTS = ['air', 'water', 'odour', 'seasonal_winter'] as const;

function pick<Value extends string>(values: readonly Value[], code: string): Value | undefined {
  return values.find((value) => value === code);
}

function splitDistance(metres: number): { value: string; unit: string } {
  const [value = '', ...unit] = formatDistanceM(metres).split(/\s+/);
  return { value, unit: unit.join(' ') };
}

export function IndustrySitesCard({ industry }: IndustrySitesCardProps) {
  const { t } = useTranslation('smartCheck');
  const sites = sortedSites(industry);

  return (
    <section
      aria-labelledby="industry-sites-title"
      className="min-w-0 rounded-icon border border-border bg-card p-4 shadow-report-card w760:px-6.5 w760:py-6"
    >
      <p className="text-meta font-extrabold tracking-label text-report-industry uppercase">
        {t('report.chapters.airIndustry.sites.eyebrow')}
      </p>
      <h3
        id="industry-sites-title"
        className="mt-1 text-[19px] leading-tight font-extrabold tracking-[-0.02em] w760:text-[21px]"
      >
        {t('report.chapters.airIndustry.sites.title')}
      </h3>
      {sites.length === 0 ? (
        <p className="mt-3 text-[14.5px] text-muted-foreground">
          {t('report.chapters.airIndustry.sites.empty', {
            distance: formatDistanceM(industry.radius_m),
          })}
        </p>
      ) : (
        <ul className="mt-2.5 grid">
          {sites.map((site) => {
            const affectsAir = site.impact_codes.includes('air');
            const sector = pick(SECTORS, site.sector_code) ?? 'other';
            const impacts = site.impact_codes.flatMap((code) => {
              const impact = pick(IMPACTS, code);
              return impact ? [t(`report.chapters.airIndustry.sites.impacts.${impact}`)] : [];
            });
            const detail = [
              t(`report.chapters.airIndustry.sites.sectors.${sector}`),
              ...impacts,
            ].join(' · ');
            const distance = splitDistance(site.distance_m);
            return (
              <li
                key={site.id}
                className="flex items-center gap-3 border-t border-border-subtle px-0.5 py-2.25 first:border-t-0"
              >
                <span
                  aria-hidden="true"
                  className={
                    affectsAir
                      ? 'size-2.5 shrink-0 rounded-full bg-(--ps-amber-800)'
                      : 'size-2.5 shrink-0 rounded-full bg-report-industry'
                  }
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="text-[15px] font-bold">{site.name}</b>
                  <small className="text-[13px] text-muted-foreground">{detail}</small>
                </span>
                <span className="shrink-0 text-[13px] text-muted-foreground">
                  <b className="text-[16px] font-extrabold text-foreground tabular-nums">
                    {distance.value}
                  </b>{' '}
                  {distance.unit}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
