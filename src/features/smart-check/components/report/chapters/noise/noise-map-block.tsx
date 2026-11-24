import { useTranslation } from 'react-i18next';
import { formatDate, formatNumber } from '@/i18n/format';
import { NOISE_BANDS, bandSwatch } from '../../../../noise-bands';
import {
  NOISE_REFERENCES,
  NOISE_SOURCE_COLORS,
  closestReference,
  decibelBand,
  listedSources,
  noiseReferenceLabel,
  sourceColorVar,
} from '../../../../noise.utils';
import type { ReadyReport } from '../../../../report.types';
import { NoiseMap } from './noise-map';

const DATE_FORMAT = { day: 'numeric', month: 'short', year: 'numeric' } as const;
const LINE_KEY = ['loud', 'busy', 'moderate', 'rail'] as const;

type NoiseMapBlockProps = {
  report: ReadyReport;
  lden: number;
  lnight: number | null;
};

export function NoiseMapBlock({ report, lden, lnight }: NoiseMapBlockProps) {
  const { t } = useTranslation('smartCheck');
  const noise = report.result.sections.noise;
  if (!noise) return null;
  const hasHeat = noise.map.heat !== undefined;
  const hasLines = noise.map.lines !== undefined;
  const sources = listedSources(noise.sources);
  const osmDate = report.result.snapshot.source_dates.osm;
  const reference = (value: number) => noiseReferenceLabel(t, closestReference(value));

  const sourceName = (source: (typeof sources)[number]) => {
    if (source.kind === 'tram') return t('report.chapters.noise.names.tram');
    if (source.kind === 'rail') return t('report.chapters.noise.names.rail');
    return (
      source.name ?? t(`report.chapters.noise.kinds.${source.kind}`, { defaultValue: source.kind })
    );
  };

  const sourceLabel = (source: (typeof sources)[number]) =>
    t(`report.chapters.noise.classes.${source.source_class}`, {
      defaultValue: t(`report.chapters.noise.kinds.${source.kind}`, { defaultValue: source.kind }),
    });

  return (
    <>
      <section
        aria-label={t('report.chapters.noise.map.label')}
        className="grid min-w-0 overflow-hidden rounded-icon border border-border bg-card shadow-report-card w960:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
      >
        <div className="flex min-w-0 flex-col">
          <div className="relative aspect-square bg-report-map-land w760:aspect-[4/3] w960:aspect-auto w960:min-h-130 w960:flex-1">
            <div className="absolute inset-0">
              <NoiseMap report={report} />
            </div>
          </div>
          {hasHeat ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-subtle bg-card px-4 py-3 text-[13px] font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.75">
                <i
                  aria-hidden="true"
                  className="block size-3.5 rounded-[4px] border border-border bg-report-noise-soft"
                />
                {t('report.chapters.noise.map.below')}
              </span>
              {NOISE_BANDS.map(([from], index) => {
                const next = NOISE_BANDS[index + 1];
                return (
                  <span key={from} className="flex items-center gap-1.75">
                    <i
                      aria-hidden="true"
                      style={{ background: bandSwatch(from) }}
                      className="block size-3.5 rounded-[4px]"
                    />
                    {next
                      ? t('report.chapters.noise.map.range', { from, to: next[0] })
                      : t('report.chapters.noise.map.above', { from })}
                  </span>
                );
              })}
              <span className="ml-0 text-[13px] font-semibold italic w560:ml-auto">
                {t('report.chapters.noise.map.estimate')}
              </span>
            </div>
          ) : hasLines ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-subtle bg-card px-4 py-3 text-[13px] font-semibold text-muted-foreground">
              {LINE_KEY.map((key) => (
                <span key={key} className="flex items-center gap-1.75">
                  <i
                    aria-hidden="true"
                    style={{ background: `var(${NOISE_SOURCE_COLORS[key]})` }}
                    className="block h-1 w-3.5 rounded-full"
                  />
                  {t(`report.chapters.noise.map.lines.${key}`)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <aside className="min-w-0 px-3.5 py-4.5 w760:px-6 w760:pt-6 w760:pb-5">
          <p className="text-meta font-extrabold tracking-label text-report-noise uppercase">
            {t('report.chapters.noise.address.eyebrow')}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2.5 w960:grid-cols-1">
            <div className="rounded-xl bg-report-noise px-3.5 py-3 text-card w760:px-5 w760:py-4">
              <b className="block text-[28px] leading-tight font-extrabold tracking-[-0.02em] w760:text-[40px]">
                {decibelBand(lden)}
              </b>
              <span className="text-[14px] text-(--ps-aqua-100)">
                {t('report.chapters.noise.address.day', { reference: reference(lden) })}
              </span>
            </div>
            {lnight !== null ? (
              <div className="rounded-xl bg-muted px-3.5 py-3 w760:px-5 w760:py-4">
                <b className="block text-[28px] leading-tight font-extrabold tracking-[-0.02em] w760:text-[40px]">
                  {decibelBand(lnight)}
                </b>
                <span className="text-[14px] text-muted-foreground">
                  {t('report.chapters.noise.address.night')}
                </span>
              </div>
            ) : null}
          </div>
          <h3 className="mt-5.5 mb-1.5 text-[17px] font-extrabold">
            {t('report.chapters.noise.sources.loudest')}
          </h3>
          {sources.length === 0 ? (
            <p className="text-[14px] text-muted-foreground">
              {t('report.chapters.noise.sources.none')}
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {sources.map((source) => (
                <li
                  key={`${source.kind}-${source.name ?? source.source_class}`}
                  className="flex items-center gap-3 border-t border-border-subtle px-0.5 py-2.5"
                >
                  <span
                    aria-hidden="true"
                    style={{
                      background: `var(${sourceColorVar(source.kind, source.source_class)})`,
                    }}
                    className="size-2.5 shrink-0 rounded-full"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <b className="text-[14.5px] font-bold">{sourceName(source)}</b>
                    <small className="text-[12.5px] text-muted-foreground">
                      {sourceLabel(source)}
                    </small>
                  </span>
                  <span className="text-[12.5px] whitespace-nowrap text-muted-foreground">
                    <b className="text-[18px] font-extrabold text-foreground tabular-nums">
                      {formatNumber(source.distance_m)}
                    </b>{' '}
                    {t('report.chapters.noise.sources.metres')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>
      <div className="grid grid-cols-2 gap-2.5 w960:grid-cols-4">
        {NOISE_REFERENCES.map((db) => (
          <span
            key={db}
            className="flex flex-col gap-0.5 rounded-xl bg-report-noise-soft px-3.5 py-3 text-[13px] font-semibold text-(--ps-aqua-800)"
          >
            <b className="text-[18px] font-extrabold text-report-noise">
              {t('report.chapters.noise.decibels', { value: formatNumber(db) })}
            </b>
            {noiseReferenceLabel(t, db)}
          </span>
        ))}
      </div>
      <p className="flex gap-2 px-1 text-[12.5px] leading-[1.45] text-muted-foreground">
        {noise.precision === 'street'
          ? t('report.chapters.noise.map.methodStreet')
          : osmDate
            ? t('report.chapters.noise.map.method', { date: formatDate(osmDate, DATE_FORMAT) })
            : t('report.chapters.noise.map.methodNoDate')}
      </p>
    </>
  );
}
