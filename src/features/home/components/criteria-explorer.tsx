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
import { ExampleLabel } from '@/components/feedback/example-label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatNumber } from '@/i18n/format';
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
    <div className="flex flex-col gap-6 rounded-2xl bg-card p-5 shadow-md ring-1 ring-border-subtle sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-h2">{t('physical.explorer.title')}</h3>
        <p className="text-small text-muted-foreground">{t('physical.explorer.hint')}</p>
      </div>
      <Tabs
        value={chapter}
        onValueChange={(value) => {
          const next = CHAPTERS.find((option) => option === value);
          if (next) {
            setChapter(next);
          }
        }}
        className="gap-6"
      >
        <TabsList
          aria-label={t('physical.explorer.navLabel')}
          className="grid h-auto w-full grid-cols-3 gap-2 bg-transparent p-0 sm:grid-cols-5"
        >
          {CHAPTERS.map((option) => {
            const Icon = CHAPTER_META[option].icon;
            return (
              <TabsTrigger
                key={option}
                value={option}
                className="h-12 gap-2 rounded-full border border-border bg-surface-subtle text-label text-brand data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon aria-hidden className="hidden size-4.5 sm:block" />
                {t(`physical.explorer.chapters.${option}.label`)}
              </TabsTrigger>
            );
          })}
        </TabsList>
        <div className="grid gap-6 md:grid-cols-[1.17fr_1fr]">
          <figure className="flex flex-col gap-2">
            <div className="relative overflow-hidden rounded-xl bg-surface-sunken">
              <img
                src={buildingImage}
                alt={t('physical.explorer.imageAlt')}
                loading="lazy"
                decoding="async"
                className="aspect-4/3 w-full object-cover"
              />
              <ExampleLabel
                label={t('physical.explorer.sceneTag')}
                className="absolute top-3 left-3 bg-card/95"
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
                        'absolute grid size-11 -translate-1/2 place-items-center rounded-full border-2 border-card shadow-md transition-transform duration-(--duration-fast) hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none',
                        chapter === option
                          ? 'scale-110 bg-cta text-cta-foreground'
                          : 'bg-primary text-primary-foreground',
                      )}
                    >
                      <Icon aria-hidden className="size-5" />
                    </button>
                  );
                })}
              </div>
            </div>
            <figcaption className="flex flex-col gap-1">
              <span className="text-label">{t(`physical.explorer.chapters.${chapter}.scene`)}</span>
              <span className="text-caption text-muted-foreground">
                {t(`physical.explorer.chapters.${chapter}.caption`)}
              </span>
              <span className="text-meta text-muted-foreground">
                {t('physical.explorer.imageNote')}
              </span>
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
                className="flex flex-col gap-4 data-[state=active]:animate-in data-[state=active]:fade-in-0"
              >
                <p className="text-caption font-bold text-muted-foreground uppercase">
                  {t('physical.explorer.questionCount', { count: questions.length })}
                </p>
                <h4 className="text-h3">{t(`physical.explorer.chapters.${option}.title`)}</h4>
                <ol className="flex flex-col gap-2.5 sm:grid sm:grid-cols-2 md:flex md:flex-col">
                  {questions.map((question, index) => (
                    <li key={question} className="flex gap-3 text-small">
                      <span className="w-6 shrink-0 font-bold text-category-green tabular-nums">
                        {formatNumber(index + 1, { minimumIntegerDigits: 2 })}
                      </span>
                      {question}
                    </li>
                  ))}
                </ol>
                <p className="rounded-lg bg-surface-sunken p-3.5 text-caption text-muted-foreground">
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
