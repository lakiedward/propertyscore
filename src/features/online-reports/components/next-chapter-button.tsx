import { ArrowRightIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ChapterId } from '../online-report.utils';

type NextChapterButtonProps = {
  chapter: ChapterId;
  onOpen: (chapter: ChapterId) => void;
};

export function NextChapterButton({ chapter, onOpen }: NextChapterButtonProps) {
  const { t } = useTranslation('onlineReports');

  return (
    <button
      type="button"
      onClick={() => {
        onOpen(chapter);
      }}
      className="flex min-h-16 items-center justify-between gap-4 rounded-lg border-[1.5px] border-border bg-card px-5 py-3 text-left transition-colors duration-(--duration-fast) hover:border-info"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-eyebrow font-extrabold text-muted-foreground uppercase">
          {t('next.eyebrow')}
        </span>
        <strong className="text-lead-sm font-bold">{t(`chapter.${chapter}`)}</strong>
      </span>
      <ArrowRightIcon aria-hidden className="size-5" />
    </button>
  );
}
