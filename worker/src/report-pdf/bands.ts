export type ScoreBand = { from: number; label: string; fill: string; text: string };

export const SCORE_BANDS: readonly ScoreBand[] = [
  { from: 0, label: 'Scăzut', fill: '#EDBDAF', text: '#862C1A' },
  { from: 40, label: 'Sub medie', fill: '#EED18A', text: '#7A5200' },
  { from: 55, label: 'Mediu', fill: '#D9DDC9', text: '#38513F' },
  { from: 70, label: 'Bun', fill: '#8FC3A0', text: '#103F32' },
  { from: 85, label: 'Foarte bun', fill: '#24704A', text: '#FFFFFF' },
];

const LOWEST_BAND: ScoreBand = { from: 0, label: 'Scăzut', fill: '#EDBDAF', text: '#862C1A' };

export function scoreBand(score: number): ScoreBand {
  return SCORE_BANDS.findLast((band) => score >= band.from) ?? LOWEST_BAND;
}

export function bandWidthPercent(index: number): number {
  const band = SCORE_BANDS[index];
  if (!band) return 0;
  const next = SCORE_BANDS[index + 1]?.from ?? 100;
  return next - band.from;
}
