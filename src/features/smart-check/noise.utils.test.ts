import { describe, expect, it } from 'vitest';
import { FREIDORF_REPORT_RESULT } from '@/test/factories/smart-check-report';
import {
  NOISE_SOURCE_COLORS,
  closestReference,
  decibelBand,
  listedSources,
  sourceColorVar,
  sourceLinesByColor,
} from './noise.utils';
import { parseReportResult } from './report.utils';

const section = parseReportResult(FREIDORF_REPORT_RESULT)?.sections.noise;
if (!section) throw new Error('fixture has no noise section');

describe('decibelBand', () => {
  it('rounds down to a band of five decibels', () => {
    expect(decibelBand(57)).toBe('55–60 dB');
    expect(decibelBand(45)).toBe('45–50 dB');
  });
});

describe('closestReference', () => {
  it('picks the everyday sound nearest to the level', () => {
    expect(closestReference(57)).toBe(60);
    expect(closestReference(48)).toBe(50);
    expect(closestReference(90)).toBe(70);
  });
});

describe('sourceColorVar', () => {
  it('colours rail, trams and roads by how loud the class is', () => {
    expect(sourceColorVar('rail', 'rail')).toBe(NOISE_SOURCE_COLORS.rail);
    expect(sourceColorVar('tram', 'tram')).toBe(NOISE_SOURCE_COLORS.busy);
    expect(sourceColorVar('road', 'primary')).toBe(NOISE_SOURCE_COLORS.loud);
    expect(sourceColorVar('road', 'secondary')).toBe(NOISE_SOURCE_COLORS.busy);
    expect(sourceColorVar('road', 'residential')).toBe(NOISE_SOURCE_COLORS.moderate);
  });
});

describe('listedSources', () => {
  it('lists the nearest distinct sources and leaves out residential streets', () => {
    const sources = listedSources(section.sources);
    expect(sources.map((source) => source.distance_m)).toEqual([54, 188, 235, 1254]);
    expect(sources.some((source) => source.source_class === 'residential')).toBe(false);
  });

  it('keeps residential streets when nothing else is near', () => {
    const only = section.sources.filter((source) => source.source_class === 'residential');
    expect(listedSources(only)).toHaveLength(only.length);
  });
});

describe('sourceLinesByColor', () => {
  it('groups the street lines of the map by source colour', () => {
    const lines = section.map.lines;
    if (!lines) throw new Error('fixture has no noise lines');
    const groups = sourceLinesByColor(lines);
    expect(groups.length).toBeGreaterThan(0);
    expect(new Set(groups.map((group) => group.color)).size).toBe(groups.length);
  });
});
