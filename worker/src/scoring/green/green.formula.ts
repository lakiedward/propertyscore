import { linearPoints, weightedScore } from '../components.ts';

type GreenWeights = {
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  c5: number;
};

export type GreenFormulaParams = {
  shareCap: number;
  smallFullM: number;
  smallZeroM: number;
  largeFullM: number;
  largeZeroM: number;
  canopyCap: number;
  weights: GreenWeights;
};

export type GreenMeasures = {
  shareNear: number | null;
  shareWide: number | null;
  smallWalkM: number | null;
  largeWalkM: number | null;
  canopy: number | null;
};

type GreenComponentKey = keyof GreenWeights;

type GreenComponent = {
  key: GreenComponentKey;
  value: number | null;
  points: number | null;
  weight: number;
};

export type GreenResult = {
  score: number | null;
  components: GreenComponent[];
};

function sharePoints(share: number | null, cap: number): number | null {
  return share === null ? null : linearPoints(share, 0, cap);
}

function walkPoints(walkM: number | null, fullAt: number, zeroAt: number): number {
  return walkM === null ? 0 : linearPoints(walkM, zeroAt, fullAt);
}

export function scoreGreen(measures: GreenMeasures, params: GreenFormulaParams): GreenResult {
  const { weights } = params;
  const components: GreenComponent[] = [
    {
      key: 'c1',
      value: measures.shareNear,
      points: sharePoints(measures.shareNear, params.shareCap),
      weight: weights.c1,
    },
    {
      key: 'c2',
      value: measures.shareWide,
      points: sharePoints(measures.shareWide, params.shareCap),
      weight: weights.c2,
    },
    {
      key: 'c3',
      value: measures.smallWalkM,
      points: walkPoints(measures.smallWalkM, params.smallFullM, params.smallZeroM),
      weight: weights.c3,
    },
    {
      key: 'c4',
      value: measures.largeWalkM,
      points: walkPoints(measures.largeWalkM, params.largeFullM, params.largeZeroM),
      weight: weights.c4,
    },
    {
      key: 'c5',
      value: measures.canopy,
      points: sharePoints(measures.canopy, params.canopyCap),
      weight: weights.c5,
    },
  ];
  return { score: weightedScore(components), components };
}
