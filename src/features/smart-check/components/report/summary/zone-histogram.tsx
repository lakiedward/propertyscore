import { useTranslation } from 'react-i18next';
import {
  SCORE_BANDS,
  SCORE_BAND_CLASSES,
  scoreBand,
  scoreBandRange,
} from '@/components/report/score-bands';
import { cn } from '@/lib/utils';

const TOP = 34;
const GRID_LINES = [25, 50, 75] as const;

type ZoneHistogramProps = {
  histogram: readonly number[];
  score: number;
  average: number | null;
  ownBin: number;
  width: number;
  height: number;
  label: string;
  className?: string;
};

export function ZoneHistogram({
  histogram,
  score,
  average,
  ownBin,
  width,
  height,
  label,
  className,
}: ZoneHistogramProps) {
  const { t } = useTranslation('smartCheck');
  const bins = Math.max(histogram.length, 1);
  const barWidth = width / bins;
  const binSize = 100 / bins;
  const tallest = Math.max(...histogram, 0);
  const barHeight = (count: number) =>
    tallest === 0 ? 0 : Math.max(count > 0 ? 3 : 0, (count / tallest) * (height - 8));
  const averageX = average === null ? null : (average / 100) * width;
  const ownHeight = barHeight(histogram[ownBin] ?? 0);
  const pinX = ownBin * barWidth + barWidth / 2;

  return (
    <svg
      viewBox={`0 0 ${width} ${height + TOP + 44}`}
      role="img"
      aria-label={label}
      className={cn('mt-3.5 block h-auto w-full overflow-visible', className)}
    >
      {GRID_LINES.map((value) => (
        <line
          key={value}
          x1={(value / 100) * width}
          x2={(value / 100) * width}
          y1={TOP}
          y2={height + TOP}
          className="stroke-border-subtle"
          strokeWidth={1}
        />
      ))}
      {histogram.map((count, index) => {
        const barH = barHeight(count);
        const from = Math.round(index * binSize);
        const to = Math.round((index + 1) * binSize) - 1;
        return (
          <rect
            key={from}
            x={index * barWidth + 2}
            y={height + TOP - barH}
            width={barWidth - 4}
            height={barH}
            rx={4}
            className={cn(
              'transition-opacity duration-(--duration-fast) hover:opacity-75',
              index === ownBin
                ? 'fill-report-hero'
                : SCORE_BAND_CLASSES[scoreBand(index * binSize + binSize / 2)].fill,
            )}
          >
            <title>{t('report.chapters.summary.formation.histBar', { count, from, to })}</title>
          </rect>
        );
      })}
      {averageX === null || average === null ? null : (
        <g aria-hidden="true">
          <line
            x1={averageX}
            x2={averageX}
            y1={TOP - 10}
            y2={height + TOP}
            className="stroke-foreground"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <text
            x={averageX - 6}
            y={TOP - 14}
            dx={averageX < 150 ? 12 : 0}
            textAnchor={averageX < 150 ? 'start' : 'end'}
            className="fill-muted-foreground text-meta font-bold"
          >
            {t('report.chapters.summary.formation.histAverage', { average })}
          </text>
        </g>
      )}
      <g aria-hidden="true" transform={`translate(${pinX},${height + TOP - ownHeight - 10})`}>
        <rect x={-44} y={-26} width={88} height={24} rx={12} className="fill-report-hero" />
        <text y={-9} textAnchor="middle" className="fill-on-inverse text-meta font-extrabold">
          {t('report.chapters.summary.formation.histAddress', { score })}
        </text>
        <path d="M-5 -2 L0 4 L5 -2z" className="fill-report-hero" />
      </g>
      <g aria-hidden="true">
        {SCORE_BANDS.map((band) => {
          const range = scoreBandRange(band);
          const x = (range.from / 100) * width;
          const bandWidth = ((range.to - range.from) / 100) * width;
          return (
            <g key={band}>
              <rect
                x={x + 1}
                y={height + TOP + 8}
                width={bandWidth - 2}
                height={6}
                rx={3}
                className={SCORE_BAND_CLASSES[band].fill}
              />
              <text
                x={x + bandWidth / 2}
                y={height + TOP + 30}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px] font-bold"
              >
                {t(`report.bands.${band}`)}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
