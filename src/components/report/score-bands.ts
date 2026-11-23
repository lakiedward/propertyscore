export const SCORE_BANDS = ['low', 'below', 'mid', 'good', 'top'] as const;

export type ScoreBand = (typeof SCORE_BANDS)[number];

const BAND_FROM: Readonly<Record<ScoreBand, number>> = {
  low: 0,
  below: 40,
  mid: 55,
  good: 70,
  top: 85,
};

export const SCORE_BAND_CLASSES: Readonly<Record<ScoreBand, { fill: string; ink: string }>> = {
  low: { fill: 'bg-band-low fill-band-low', ink: 'text-band-low-ink' },
  below: { fill: 'bg-band-below fill-band-below', ink: 'text-band-below-ink' },
  mid: { fill: 'bg-band-mid fill-band-mid', ink: 'text-band-mid-ink' },
  good: { fill: 'bg-band-good fill-band-good', ink: 'text-band-good-ink' },
  top: { fill: 'bg-band-top fill-band-top', ink: 'text-band-top-ink' },
};

export function scoreBand(score: number): ScoreBand {
  return SCORE_BANDS.findLast((band) => score >= BAND_FROM[band]) ?? 'low';
}

export function scoreBandRange(band: ScoreBand): { from: number; to: number } {
  const index = SCORE_BANDS.indexOf(band);
  const next = SCORE_BANDS[index + 1];
  return { from: BAND_FROM[band], to: next === undefined ? 100 : BAND_FROM[next] };
}
