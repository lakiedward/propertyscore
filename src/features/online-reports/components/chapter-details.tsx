import type { ReportResult } from '../online-report.types';
import type { DayMoment, ScoreChapterId } from '../online-report.utils';
import { AccessibilityChapter } from './accessibility-chapter';
import { AirChapter } from './air-chapter';
import { FifteenMinuteChapter } from './fifteen-minute-chapter';
import { IndustryChapter } from './industry-chapter';
import { NoiseChapter } from './noise-chapter';
import { SafetyChapter } from './safety-chapter';

type ChapterDetailsProps = {
  chapter: ScoreChapterId;
  result: ReportResult;
  selectedId: string | null;
  onSelect: (id: string) => void;
  moment: DayMoment;
  onMomentChange: (moment: DayMoment) => void;
};

export function ChapterDetails({
  chapter,
  result,
  selectedId,
  onSelect,
  moment,
  onMomentChange,
}: ChapterDetailsProps) {
  switch (chapter) {
    case 'noise':
      return result.noise ? (
        <NoiseChapter section={result.noise} moment={moment} onMomentChange={onMomentChange} />
      ) : null;
    case 'air':
      return result.air ? (
        <AirChapter section={'data_status' in result.air ? result.air : undefined} />
      ) : null;
    case 'safety':
      return result.safety ? (
        <SafetyChapter
          section={result.safety.status === 'scored' ? result.safety : undefined}
          moment={moment}
          onMomentChange={onMomentChange}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ) : null;
    case 'accessibility':
      return result.accessibility ? (
        <AccessibilityChapter
          section={result.accessibility.status === 'scored' ? result.accessibility : undefined}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ) : null;
    case 'fifteen_minute':
      return result.fifteen_minute ? (
        <FifteenMinuteChapter
          section={result.fifteen_minute}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ) : null;
    case 'industry':
      return result.industry ? (
        <IndustryChapter section={result.industry} selectedId={selectedId} onSelect={onSelect} />
      ) : null;
    default:
      return null;
  }
}
