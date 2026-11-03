import type { z } from 'zod';
import type { getOnlineReport } from './api/online-reports.api';
import type {
  airSectionSchema,
  greenSectionSchema,
  industrySectionSchema,
  noiseSectionSchema,
  reportResultSchema,
} from './online-report.schemas';

export type ReportResult = z.infer<typeof reportResultSchema>;

export type OnlineReport = Awaited<ReturnType<typeof getOnlineReport>>;

type GreenSection = z.infer<typeof greenSectionSchema>;

export type ScoredGreenSection = Extract<GreenSection, { status: 'scored' }>;

export type GreenPark = ScoredGreenSection['parks'][number];

export type GreenComponent = ScoredGreenSection['components'][number];

export type NoiseSection = z.infer<typeof noiseSectionSchema>;

export type ScoredAirSection = Extract<z.infer<typeof airSectionSchema>, { data_status: string }>;

export type IndustrySection = z.infer<typeof industrySectionSchema>;

export type IndustrySite = IndustrySection['sites'][number];
