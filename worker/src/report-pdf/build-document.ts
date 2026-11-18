import { readFile } from 'node:fs/promises';

import { fontAssets, fontFaceCss, mapAssets, MAP_STYLES_PATH } from '../pdf/assets.ts';
import type { PdfAsset, PdfDocument } from '../pdf/render-pdf.ts';
import type { ChapterBuilder } from './chapter.ts';
import { accessibilityChapter } from './chapters/accessibility.ts';
import { airIndustryChapter } from './chapters/air-industry.ts';
import { closingChapter } from './chapters/closing.ts';
import { educationHealthChapter } from './chapters/education-health.ts';
import { fifteenMinuteChapter } from './chapters/fifteen-minute.ts';
import { greenChapter } from './chapters/green.ts';
import { investmentChapter } from './chapters/investment.ts';
import { noiseChapter } from './chapters/noise.ts';
import { safetyChapter } from './chapters/safety.ts';
import { seismicChapter } from './chapters/seismic.ts';
import { summaryChapter } from './chapters/summary.ts';
import { esc } from './format.ts';
import { MAP_TILE_HOST, mapSpecsScript, type MapSpec } from './maps.ts';
import type { ReportData } from './report-data.ts';

const MAP_CLIENT_PATH = '/assets/map-client.js';

const CHAPTERS: readonly ChapterBuilder[] = [
  summaryChapter,
  safetyChapter,
  accessibilityChapter,
  fifteenMinuteChapter,
  educationHealthChapter,
  greenChapter,
  noiseChapter,
  airIndustryChapter,
  seismicChapter,
  investmentChapter,
  closingChapter,
];

export async function buildReportDocument(report: ReportData): Promise<PdfDocument> {
  const [styles, mapClient, fonts, mapLibrary] = await Promise.all([
    readFile(new URL('./report.css', import.meta.url), 'utf8'),
    readFile(new URL('./map-client.js', import.meta.url), 'utf8'),
    fontAssets(),
    mapAssets(),
  ]);
  const chapters = CHAPTERS.flatMap((build) => build(report) ?? []);
  const maps: MapSpec[] = chapters.flatMap((chapter) => chapter.maps);
  const mapScripts =
    maps.length === 0
      ? ''
      : `${mapSpecsScript(maps)}<script type="module" src="${MAP_CLIENT_PATH}"></script>`;
  const html = `<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>Smart Check · ${esc(report.addressText)}</title><link rel="stylesheet" href="${MAP_STYLES_PATH}"><style>${fontFaceCss()}\n${styles}</style></head><body>${chapters.map((chapter) => chapter.html).join('')}${mapScripts}</body></html>`;
  const assets = new Map<string, PdfAsset>([
    ...fonts,
    ...mapLibrary,
    [MAP_CLIENT_PATH, { contentType: 'text/javascript', body: mapClient }],
  ]);
  return { html, assets, allowedHosts: maps.length === 0 ? [] : [MAP_TILE_HOST] };
}
