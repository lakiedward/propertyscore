import type { MapSpec } from './maps.ts';
import type { ReportData } from './report-data.ts';

export type ChapterOutput = { html: string; maps: MapSpec[] };

export type ChapterBuilder = (report: ReportData) => ChapterOutput | null;
