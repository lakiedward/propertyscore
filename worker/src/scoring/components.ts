export type ScoreComponent = {
  key: string;
  weight: number;
  points: number | null;
};

export function linearPoints(value: number, zeroAt: number, fullAt: number): number {
  if (zeroAt === fullAt) throw new RangeError('zeroAt and fullAt must differ');
  const ratio = (value - zeroAt) / (fullAt - zeroAt);
  return Math.min(1, Math.max(0, ratio));
}

export function weightedScore(components: readonly ScoreComponent[]): number | null {
  const scored = components.filter(
    (component): component is ScoreComponent & { points: number } =>
      component.points !== null && component.weight > 0,
  );
  const totalWeight = scored.reduce((sum, component) => sum + component.weight, 0);
  if (totalWeight === 0) return null;
  const total = scored.reduce((sum, component) => sum + component.weight * component.points, 0);
  return Math.round((100 * total) / totalWeight);
}
