import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import type { ZoneScoreKey } from '../home.categories';

type ScoreRingTone = ZoneScoreKey | 'overall';

const RING_STROKE: Readonly<Record<ScoreRingTone, { track: string; progress: string }>> = {
  overall: { track: 'stroke-on-inverse/16', progress: 'stroke-cta' },
  safety: { track: 'stroke-category-safety-surface', progress: 'stroke-category-safety' },
  city: { track: 'stroke-category-city-surface', progress: 'stroke-category-city' },
  transport: {
    track: 'stroke-category-transport-surface',
    progress: 'stroke-category-transport',
  },
  green: { track: 'stroke-category-green-surface', progress: 'stroke-category-green' },
  education: {
    track: 'stroke-category-education-surface',
    progress: 'stroke-category-education',
  },
  health: { track: 'stroke-category-health-surface', progress: 'stroke-category-health' },
  shopping: { track: 'stroke-category-shopping-surface', progress: 'stroke-category-shopping' },
};

type ScoreRingProps = {
  value: number;
  tone: ScoreRingTone;
  label: string;
  caption?: string;
  className?: string;
};

export function ScoreRing({ value, tone, label, caption, className }: ScoreRingProps) {
  const isOverall = tone === 'overall';
  const size = isOverall ? 120 : 40;
  const radius = isOverall ? 50 : 16;
  const strokeWidth = isOverall ? 10 : 4;
  const center = size / 2;
  const stroke = RING_STROKE[tone];

  return (
    <span role="img" aria-label={label} className={cn('relative block aspect-square', className)}>
      <svg viewBox={`0 0 ${String(size)} ${String(size)}`} aria-hidden="true" className="size-full">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={stroke.track}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          pathLength={100}
          strokeDasharray={`${String(value)} 100`}
          strokeLinecap="round"
          transform={`rotate(-90 ${String(center)} ${String(center)})`}
          className={stroke.progress}
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <b
          className={cn(
            'tabular-nums',
            isOverall
              ? 'text-score-2xl text-on-inverse'
              : 'text-lead-sm font-extrabold tracking-[-0.03em] text-info-ink',
          )}
        >
          {formatNumber(value)}
        </b>
        {caption ? (
          <small className="mt-0.5 text-small font-bold text-on-info-muted">{caption}</small>
        ) : null}
      </span>
    </span>
  );
}
