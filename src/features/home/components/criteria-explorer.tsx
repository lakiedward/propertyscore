import {
  Building2Icon,
  DoorOpenIcon,
  PlugZapIcon,
  SunIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import buildingImage from '@/assets/home/inspection-building.webp';

const CHAPTERS = ['building', 'apartment', 'systems', 'comfort', 'risks'] as const;
type Chapter = (typeof CHAPTERS)[number];

const CHAPTER_META: Readonly<Record<Chapter, { icon: LucideIcon; pin: { x: number; y: number } }>> =
  {
    building: { icon: Building2Icon, pin: { x: 27, y: 38 } },
    apartment: { icon: DoorOpenIcon, pin: { x: 53, y: 41 } },
    systems: { icon: PlugZapIcon, pin: { x: 86, y: 39 } },
    comfort: { icon: SunIcon, pin: { x: 20, y: 68 } },
    risks: { icon: TriangleAlertIcon, pin: { x: 72, y: 57 } },
  };

function pinStyle(chapter: Chapter): CSSProperties {
  const { x, y } = CHAPTER_META[chapter].pin;
  return { left: `${String(x)}%`, top: `${String(y)}%` };
}

export function CriteriaExplorer() {
  const { t } = useTranslation('home');
  const [chapter, setChapter] = useState<Chapter>('building');

  return (
    <div className="mb-5 overflow-hidden rounded-[19px] border border-border bg-card shadow-explorer w820:rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 px-4 pt-5 pb-3.5 w820:px-6.75 w820:pt-6 w820:pb-4">
        <h3 className="text-[22px] leading-[1.08] font-[710] tracking-[-0.035em] text-foreground w520:text-[23px]">
          {t('physical.explorer.title')}
        </h3>
        <p className="max-w-copy text-meta text-muted-foreground">{t('physical.explorer.hint')}</p>
      </div>
      <Tabs
        value={chapter}
        onValueChange={(value) => {
          const next = CHAPTERS.find((option) => option === value);
          if (next) {
            setChapter(next);
          }
        }}
        className="gap-0"
      >
        <TabsList
          aria-label={t('physical.explorer.navLabel')}
          className="mx-3.25 grid h-auto w-auto grid-cols-6 gap-1.25 rounded-none border-b border-border-subtle bg-transparent p-0 pb-3.5 w820:mx-5.75 w820:grid-cols-5 w820:gap-1.5 w820:pb-5"
        >
          {CHAPTERS.map((option) => {
            const Icon = CHAPTER_META[option].icon;
            return (
              <TabsTrigger
                key={option}
                value={option}
                className="col-span-2 h-11 gap-1 rounded-[40px] border-0 px-0.75 py-1.75 text-meta font-normal text-ink-soft shadow-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none w820:col-span-1 w820:h-12 w820:gap-2.25 w820:px-1.5 w820:py-0.25 w820:text-small [&:nth-child(n+4)]:col-span-3 w820:[&:nth-child(n+4)]:col-span-1 [&[data-state=active]_svg]:text-cta"
              >
                <Icon aria-hidden className="hidden size-5 w820:block" />
                {t(`physical.explorer.chapters.${option}.label`)}
              </TabsTrigger>
            );
          })}
        </TabsList>
        <div className="grid grid-cols-1 md:grid-cols-[1.17fr_1fr]">
          <figure className="flex flex-col bg-surface-scene">
            <p className="flex items-center justify-between gap-3 px-4.25 pt-4 text-nav-sm font-bold text-brand w820:px-6.75 w820:pt-6.5 w820:text-caption">
              <span>{t(`physical.explorer.chapters.${chapter}.scene`)}</span>
              <span className="text-meta text-ink-faint">{t('physical.explorer.sceneTag')}</span>
            </p>
            <div className="relative">
              <img
                src={buildingImage}
                alt={t('physical.explorer.imageAlt')}
                loading="lazy"
                decoding="async"
                className="aspect-4/3 w-full object-cover mix-blend-multiply"
              />
              <div role="group" aria-label={t('physical.explorer.pinsLabel')}>
                {CHAPTERS.map((option) => {
                  const Icon = CHAPTER_META[option].icon;
                  const label = t(`physical.explorer.chapters.${option}.label`);
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-label={t('physical.explorer.pinLabel', { chapter: label })}
                      aria-pressed={chapter === option}
                      onClick={() => {
                        setChapter(option);
                      }}
                      style={pinStyle(option)}
                      className={cn(
                        'absolute flex h-11.5 min-w-11.5 -translate-1/2 items-center justify-center gap-1.5 rounded-full border-2 border-card px-3 text-small font-bold shadow-pin transition-transform duration-(--duration-fast) hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none',
                        chapter === option ? 'bg-cta text-brand' : 'bg-card text-brand',
                      )}
                    >
                      <Icon aria-hidden className="size-5" />
                      {chapter === option ? <span aria-hidden="true">{label}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <figcaption className="px-6.75 pt-1.75 pb-6.25">
              <span className="block max-w-96 text-body font-[570] text-ink-strong">
                {t(`physical.explorer.chapters.${chapter}.caption`)}
              </span>
              <small className="mt-2.5 block text-[10px] leading-normal text-ink-faint">
                {t('physical.explorer.imageNote')}
              </small>
            </figcaption>
          </figure>
          {CHAPTERS.map((option) => {
            const questions = t(`physical.explorer.chapters.${option}.questions`, {
              returnObjects: true,
            });
            return (
              <TabsContent
                key={option}
                value={option}
                className="border border-border-subtle bg-card px-4.5 py-5.25 data-[state=active]:animate-in data-[state=active]:fade-in-0 w820:border-0 w820:px-7.5 w820:pt-6.75 w820:pb-6.25"
              >
                <p className="flex items-center justify-between gap-3 text-nav-sm text-ink-faint">
                  <span className="font-[740] text-brand">
                    {t(`physical.explorer.chapters.${option}.label`)}
                  </span>
                  {t('physical.explorer.questionCount', { count: questions.length })}
                </p>
                <h4 className="mt-3.25 mb-4.5 max-w-90 text-[25px] leading-[1.16] font-bold tracking-[-0.04em] text-brand w520:mt-3.75 w520:mb-5.25 w520:text-[28px]">
                  {t(`physical.explorer.chapters.${option}.title`)}
                </h4>
                <ul>
                  {questions.map((question) => (
                    <li
                      key={question}
                      className="relative border-t border-border-subtle py-2.75 pl-4.5 text-caption text-ink-strong before:absolute before:top-[19px] before:left-0 before:size-1.5 before:rounded-full before:bg-category-green w520:text-small"
                    >
                      {question}
                    </li>
                  ))}
                </ul>
                <p className="mt-4.25 max-w-95 border-t border-border-subtle pt-3.5 text-[10px] leading-[1.6] text-ink-faint">
                  {t('physical.explorer.limit')}
                </p>
              </TabsContent>
            );
          })}
        </div>
      </Tabs>
    </div>
  );
}
