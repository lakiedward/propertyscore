import { CheckIcon, XIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { REPORT_HUES, type ReportHue } from './report-hues';
import {
  SCORE_BANDS,
  SCORE_BAND_CLASSES,
  scoreBand,
  scoreBandRange,
  type ScoreBand,
} from './score-bands';

const CLOSE_POINTS = 12;

type ChapterScoreCardProps = {
  hue: ReportHue;
  score: number;
  average: number | null;
  range: { min: number; max: number } | null;
  headline: ReactNode;
  bandLabel: string;
  youLabel: string;
  averageLabel: string | null;
  rangeLabel: string | null;
  measures: { included: ReactNode; excluded: ReactNode };
  kicker?: string;
  className?: string;
};

function BandTrack({ activeBand }: { activeBand: ScoreBand }) {
  return (
    <div aria-hidden="true" className="flex h-3 gap-0.75 overflow-hidden rounded-full">
      {SCORE_BANDS.map((band) => {
        const { from, to } = scoreBandRange(band);
        return (
          <i
            key={band}
            style={{ flex: to - from }}
            className={cn(
              'block',
              SCORE_BAND_CLASSES[band].fill,
              band === activeBand && 'saturate-125',
            )}
          />
        );
      })}
    </div>
  );
}

export function ChapterScoreCard({
  hue,
  score,
  average,
  range,
  headline,
  bandLabel,
  youLabel,
  averageLabel,
  rangeLabel,
  measures,
  kicker,
  className,
}: ChapterScoreCardProps) {
  const colors = REPORT_HUES[hue];
  const band = scoreBand(score);
  const isAverageClose = average !== null && Math.abs(average - score) < CLOSE_POINTS;
  return (
    <section
      className={cn(
        'grid min-w-0 gap-x-10 gap-y-5 rounded-icon border border-border bg-card p-5 shadow-report-card w760:grid-cols-[auto_minmax(0,1fr)] w760:items-center w760:p-7',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3.5 border-b border-border-subtle pb-4 w760:flex-col w760:items-start w760:gap-2.5 w760:border-r w760:border-b-0 w760:pr-10 w760:pb-0">
        {kicker ? (
          <span
            className={cn(
              'w-full text-[13px] font-extrabold tracking-label uppercase',
              colors.text,
            )}
          >
            {kicker}
          </span>
        ) : null}
        <span
          className={cn(
            'text-[64px] leading-[0.95] font-extrabold tracking-[-0.04em] tabular-nums',
            colors.text,
          )}
        >
          {score}
          <small className="ml-0.5 text-[20px] font-bold tracking-normal text-muted-foreground">
            /100
          </small>
        </span>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-3 py-1.25 text-[14px] font-extrabold text-primary',
            SCORE_BAND_CLASSES[band].fill.split(' ')[0],
          )}
        >
          {bandLabel}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[clamp(18px,1.8vw,22px)] leading-[1.25] font-bold tracking-[-0.01em]">
          {headline}
        </p>
        <div className={cn('relative mt-2 pt-8.5', isAverageClose ? 'pb-14' : 'pb-10')}>
          <BandTrack activeBand={band} />
          {range && rangeLabel ? (
            <span
              style={{ left: `${range.min}%`, width: `${range.max - range.min}%` }}
              className="absolute top-7 h-6 rounded-[3px] border-x-2 border-foreground/60 bg-foreground/6"
            >
              <span
                className={cn(
                  'absolute left-1/2 -translate-x-1/2 text-[12px] font-semibold whitespace-nowrap text-muted-foreground',
                  isAverageClose ? 'top-12' : 'top-7.5',
                )}
              >
                {rangeLabel}
              </span>
            </span>
          ) : null}
          {average !== null && averageLabel ? (
            <span
              style={{ left: `${average}%` }}
              className="absolute top-6.5 h-7 w-0.5 -translate-x-px bg-foreground"
            >
              <span
                className={cn(
                  'absolute left-1/2 -translate-x-1/2 text-[12px] font-bold whitespace-nowrap',
                  isAverageClose ? 'top-7.5' : '-top-5',
                )}
              >
                {averageLabel}
              </span>
            </span>
          ) : null}
          <span style={{ left: `${score}%` }} className="absolute top-0 -translate-x-1/2">
            <b
              className={cn(
                'relative inline-block rounded-full px-2.5 py-0.75 text-[13px] font-extrabold whitespace-nowrap text-primary-foreground',
                colors.fill,
              )}
            >
              {youLabel}
              <i
                aria-hidden="true"
                className={cn(
                  'absolute -bottom-1 left-1/2 -ml-1.25 size-2.5 rotate-45 rounded-[2px]',
                  colors.fill,
                )}
              />
            </b>
            <i
              aria-hidden="true"
              className={cn(
                'absolute top-7.5 left-1/2 -ml-2 size-4 rounded-full shadow-[0_0_0_3px_var(--card)]',
                colors.fill,
              )}
            />
          </span>
        </div>
      </div>
      <div className="col-span-full flex flex-wrap gap-x-5 gap-y-2 border-t border-border-subtle pt-3.5 text-[13.5px] leading-[1.4] text-muted-foreground">
        <span className="flex items-start gap-1.75">
          <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
          <span className="[&_b]:font-bold [&_b]:text-foreground">{measures.included}</span>
        </span>
        <span className="flex items-start gap-1.75">
          <XIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-[color:var(--ps-coral-600)]" />
          <span className="[&_b]:font-bold [&_b]:text-foreground">{measures.excluded}</span>
        </span>
      </div>
    </section>
  );
}
