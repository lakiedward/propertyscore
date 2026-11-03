import type { z } from 'zod';
import type { getOnlineReport } from './api/online-reports.api';
import type {
  airSectionSchema,
  educationSectionSchema,
  fifteenMinuteSectionSchema,
  healthSectionSchema,
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

export type FifteenMinuteSection = z.infer<typeof fifteenMinuteSectionSchema>;

export type FifteenMinutePlace = FifteenMinuteSection['places'][number];

export type ScoredEducationSection = Extract<
  z.infer<typeof educationSectionSchema>,
  { status: 'scored' }
>;

export type ScoredHealthSection = Extract<
  z.infer<typeof healthSectionSchema>,
  { status: 'scored' }
>;
