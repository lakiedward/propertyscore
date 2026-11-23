import { useTranslation } from 'react-i18next';
import type { ReportChapter } from '../../report-chapters';

type ReportChapterPlaceholderProps = {
  chapter: ReportChapter;
};

export function ReportChapterPlaceholder({ chapter }: ReportChapterPlaceholderProps) {
  const { t } = useTranslation('smartCheck');
  const titleId = `report-chapter-${chapter}`;

  return (
    <section id={chapter} aria-labelledby={titleId} className="flex flex-col gap-2 py-6">
      <h2 id={titleId} className="text-h4">
        {t(`report.chapters.${chapter}.title`)}
      </h2>
    </section>
  );
}
