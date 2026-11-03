import {
  bestAndWorst,
  CATEGORY_KEYS,
  binRange,
  chapterOfCategory,
  circleRing,
  histogramBin,
  isDarkColour,
  nextChapter,
  reportCode,
  reportHighlights,
  scoreBand,
  type CategoryKey,
  type CategorySummary,
} from './online-report.utils';

function summaries(
  scores: Partial<Record<CategoryKey, [score: number, average: number | null]>>,
): Record<CategoryKey, CategorySummary> {
  const empty = (): CategorySummary => ({
    score: null,
    percentile: null,
    city_avg: null,
    histogram: [],
    weight: 10,
  });
  const result: Record<CategoryKey, CategorySummary> = {
    safety: empty(),
    accessibility: empty(),
    fifteen_minute: empty(),
    green: empty(),
    noise: empty(),
    air: empty(),
    industry: empty(),
    education: empty(),
    health: empty(),
  };
  for (const key of CATEGORY_KEYS) {
    const value = scores[key];
    const category = result[key];
    if (value) {
      category.score = value[0];
      category.city_avg = value[1];
      category.percentile = 50;
    }
  }
  return result;
}

describe('online report utils', () => {
  it('names the score band at each threshold', () => {
    expect([90, 85, 84, 70, 69, 55, 54, 40, 39, 0].map(scoreBand)).toEqual([
      'excellent',
      'excellent',
      'veryGood',
      'veryGood',
      'good',
      'good',
      'average',
      'average',
      'belowAverage',
      'belowAverage',
    ]);
  });

  it('walks the chapters in order and stops after the last one', () => {
    expect(nextChapter('summary')).toBe('safety');
    expect(nextChapter('green')).toBe('noise');
    expect(nextChapter('industry')).toBeUndefined();
  });

  it('opens education and health in the 15-minute chapter', () => {
    expect(chapterOfCategory('education')).toBe('fifteen_minute');
    expect(chapterOfCategory('health')).toBe('fifteen_minute');
    expect(chapterOfCategory('green')).toBe('green');
  });

  it('lists the scores clearly above and below the city average, largest gap first', () => {
    const { strengths, concerns } = reportHighlights(
      summaries({
        green: [84, 34],
        safety: [70, 60],
        air: [62, 60],
        noise: [40, 63],
        health: [50, 58],
        education: [90, null],
      }),
    );

    expect(strengths.map((item) => item.key)).toEqual(['green', 'safety']);
    expect(concerns.map((item) => item.key)).toEqual(['noise', 'health']);
    expect(strengths[0]).toEqual({ key: 'green', score: 84, cityAverage: 34, percentile: 50 });
  });

  it('keeps at most three highlights on each side', () => {
    const { strengths } = reportHighlights(
      summaries({ green: [90, 10], safety: [90, 20], air: [90, 30], noise: [90, 40] }),
    );
    expect(strengths.map((item) => item.key)).toEqual(['green', 'safety', 'air']);
  });

  it('finds the best and the worst scored category', () => {
    expect(bestAndWorst(summaries({ green: [84, 34], noise: [40, 63] }))).toEqual({
      best: 'green',
      worst: 'noise',
    });
    expect(bestAndWorst(summaries({ green: [84, 34] }))).toEqual({
      best: 'green',
      worst: undefined,
    });
    expect(bestAndWorst(summaries({}))).toEqual({ best: undefined, worst: undefined });
  });

  it('builds the report code from the year and the padded number', () => {
    expect(reportCode(8, '2026-11-03T10:00:00Z')).toBe('SC-2026-00008');
    expect(reportCode(10481, '2026-10-23T10:00:00Z')).toBe('SC-2026-10481');
  });

  it('puts a score in its 5-point histogram group, 100 in the last one', () => {
    expect(histogramBin(0, 20)).toBe(0);
    expect(histogramBin(84, 20)).toBe(16);
    expect(histogramBin(100, 20)).toBe(19);
    expect(binRange(16)).toEqual({ from: 80, to: 84 });
    expect(binRange(19)).toEqual({ from: 95, to: 99 });
  });

  it('draws a closed ring at the requested distance', () => {
    const center: [number, number] = [21.2257, 45.7537];
    const ring = circleRing(center, 500, 8);

    expect(ring).toHaveLength(9);
    expect(ring[0]?.[0]).toBeCloseTo(ring[8]?.[0] ?? 0, 9);
    expect(ring[0]?.[1]).toBeCloseTo(ring[8]?.[1] ?? 0, 9);
    const north = ring[0] ?? center;
    const metresNorth = ((north[1] - center[1]) * Math.PI * 6_371_008.8) / 180;
    expect(metresNorth).toBeCloseTo(500, 0);
  });
});

describe('isDarkColour', () => {
  it('tells dark route colours from light ones', () => {
    expect(isDarkColour('#C0392B')).toBe(true);
    expect(isDarkColour('#F6C93E')).toBe(false);
    expect(isDarkColour('red')).toBe(false);
  });
});
