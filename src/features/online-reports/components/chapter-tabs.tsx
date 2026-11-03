import { useTranslation } from 'react-i18next';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { CHAPTER_IDS, isScoreChapter, type ChapterId } from '../online-report.utils';
import { CATEGORY_ICON, CHAPTER_ICON, categoryClasses } from './category-style';

type ChapterTabsProps = {
  scoreOf: (chapter: ChapterId) => number | null;
};

export function ChapterTabs({ scoreOf }: ChapterTabsProps) {
  const { t } = useTranslation('onlineReports');

  return (
    <div className="border-b border-border bg-background">
      <TabsList
        variant="line"
        aria-label={t('tabs.label')}
        className="mx-auto flex h-auto w-full max-w-wide [scrollbar-width:none] justify-start gap-1 overflow-x-auto px-gutter"
      >
        {CHAPTER_IDS.map((chapter) => {
          const Icon = isScoreChapter(chapter) ? CATEGORY_ICON[chapter] : CHAPTER_ICON[chapter];
          const score = scoreOf(chapter);
          const hue = isScoreChapter(chapter) ? categoryClasses(chapter) : undefined;
          return (
            <TabsTrigger
              key={chapter}
              value={chapter}
              className={cn(
                'h-14 flex-none gap-2 rounded-none border-0 border-b-3 border-transparent px-3 text-small font-semibold text-muted-foreground after:hidden hover:text-foreground data-active:font-extrabold data-active:text-foreground',
                hue ? hue.underline : 'data-active:border-info',
              )}
            >
              <Icon aria-hidden className="size-4.5" />
              {t(`chapter.${chapter}`)}
              {score === null ? (
                <span className="rounded-sm border border-dashed border-trust-none-border px-1.5 text-meta font-semibold text-data-missing italic">
                  {t('tabs.noScore')}
                </span>
              ) : (
                <span
                  className={cn(
                    'rounded-sm px-1.75 py-0.5 text-meta font-extrabold tabular-nums',
                    hue ? hue.tile : 'bg-info text-info-foreground',
                  )}
                >
                  {formatNumber(score)}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </div>
  );
}
