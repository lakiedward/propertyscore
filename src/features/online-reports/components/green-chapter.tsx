import type { ScoredGreenSection } from '../online-report.types';
import { GreenBreakdown } from './green-breakdown';
import { GreenParks } from './green-parks';
import { GreenShare } from './green-share';

type GreenChapterProps = {
  section: ScoredGreenSection;
  radiusM: number;
  onRadiusChange: (radiusM: number) => void;
  selectedParkId: string | null;
  onSelectPark: (parkId: string) => void;
};

export function GreenChapter({
  section,
  radiusM,
  onRadiusChange,
  selectedParkId,
  onSelectPark,
}: GreenChapterProps) {
  return (
    <div className="flex flex-col gap-5">
      <GreenShare section={section} radiusM={radiusM} onRadiusChange={onRadiusChange} />
      <GreenParks section={section} selectedParkId={selectedParkId} onSelectPark={onSelectPark} />
      <GreenBreakdown section={section} />
    </div>
  );
}
