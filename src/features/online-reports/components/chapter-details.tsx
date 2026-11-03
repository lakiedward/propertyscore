import type { ReportResult } from '../online-report.types';
import type { ScoreChapterId } from '../online-report.utils';
import { AirChapter } from './air-chapter';
import { FifteenMinuteChapter } from './fifteen-minute-chapter';
import { IndustryChapter } from './industry-chapter';
import { NoiseChapter, type NoiseMoment } from './noise-chapter';

type ChapterDetailsProps = {
  chapter: ScoreChapterId;
  result: ReportResult;
  selectedId: string | null;
  onSelect: (id: string) => void;
  noiseMoment: NoiseMoment;
  onNoiseMomentChange: (moment: NoiseMoment) => void;
};

export function ChapterDetails({
  chapter,
  result,
  selectedId,
  onSelect,
  noiseMoment,
  onNoiseMomentChange,
}: ChapterDetailsProps) {
  switch (chapter) {
    case 'noise':
      return result.noise ? (
        <NoiseChapter
          section={result.noise}
          moment={noiseMoment}
          onMomentChange={onNoiseMomentChange}
        />
      ) : null;
    case 'air':
      return result.air ? (
        <AirChapter section={'data_status' in result.air ? result.air : undefined} />
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
