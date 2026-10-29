import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  LightbulbIcon,
  SaveIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { PUBLISH_SECTION } from '../publish.example';
import { PUBLISH_STEPS, type PublishStepKey } from '../publish.steps';
import { StepPreview } from './step-preview';

const FIRST_STEP: PublishStepKey = 'type';

export function StepsExplorer() {
  const { t } = useTranslation('publish');
  const [activeKey, setActiveKey] = useState<PublishStepKey>(FIRST_STEP);
  const activeIndex = PUBLISH_STEPS.findIndex((step) => step.key === activeKey);
  const lastIndex = PUBLISH_STEPS.length - 1;

  const handleValueChange = (value: string) => {
    const step = PUBLISH_STEPS.find((item) => item.key === value);
    if (step) {
      setActiveKey(step.key);
    }
  };

  const goTo = (index: number) => {
    const step = PUBLISH_STEPS[index];
    if (step) {
      setActiveKey(step.key);
    }
  };

  return (
    <section
      id={PUBLISH_SECTION.steps}
      aria-labelledby="publish-steps-title"
      className="scroll-mt-24 bg-card py-11 w767:py-20"
    >
      <div className="page-wrap flex flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div className="flex flex-col gap-3">
            <h2 id="publish-steps-title" className="text-h2 leading-[1.12] text-foreground">
              {t('steps.titleLead')}{' '}
              <span className="text-brand underline decoration-cta decoration-[0.18em] underline-offset-[0.12em] [text-decoration-skip-ink:none]">
                {t('steps.titleAccent')}
              </span>
            </h2>
            <p className="text-lead-sm leading-[1.55] text-muted-foreground">{t('steps.intro')}</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <InfoChip
              icon={<ClockIcon />}
              title={t('steps.duration.title')}
              text={t('steps.duration.text')}
            />
            <InfoChip
              icon={<SaveIcon />}
              title={t('steps.autosave.title')}
              text={t('steps.autosave.text')}
            />
          </div>
        </div>
        <Tabs value={activeKey} onValueChange={handleValueChange} className="gap-5">
          <div className="[scrollbar-width:none] overflow-x-auto p-0.5 pb-2 w1059:overflow-visible w1059:pb-0.5">
            <TabsList
              variant="line"
              aria-label={t('steps.listLabel')}
              className="relative grid h-auto w-full min-w-195 grid-cols-6 gap-2 p-0 w767:min-w-0"
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-[8.333%] top-6.5 h-1 rounded-full bg-border-hairline"
              />
              <span
                aria-hidden="true"
                className="absolute top-6.5 left-[8.333%] h-1 rounded-full bg-primary transition-[width] duration-(--duration-slow) ease-standard"
                style={{ width: `${(activeIndex / PUBLISH_STEPS.length) * 100}%` }}
              />
              {PUBLISH_STEPS.map((step, index) => {
                const isActive = index === activeIndex;
                const isDone = index < activeIndex;
                const Icon = step.icon;
                return (
                  <TabsTrigger
                    key={step.key}
                    value={step.key}
                    className="h-auto flex-col justify-start gap-2.5 rounded-md border-0 px-1 pt-0 pb-3 whitespace-normal text-foreground after:hidden hover:text-foreground focus-visible:border-0 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none data-active:bg-transparent data-active:text-foreground"
                  >
                    <span
                      className={cn(
                        'relative grid size-14 place-items-center rounded-full shadow-step transition-colors duration-(--duration-fast)',
                        isActive && cn(step.hue.activeTile, 'shadow-step-active'),
                        isDone && 'bg-primary text-primary-foreground',
                        !isActive && !isDone && step.hue.tile,
                      )}
                    >
                      <Icon aria-hidden className="size-5.5" />
                    </span>
                    <span className="flex flex-col items-center gap-0.5 text-center">
                      <span
                        className={cn(
                          'text-meta leading-[1.55] font-extrabold tracking-[0.04em] uppercase tabular-nums',
                          isActive ? step.hue.label : 'text-muted-foreground',
                        )}
                      >
                        {t('steps.stepNumber', { number: index + 1 })}
                      </span>{' '}
                      <strong
                        className={cn(
                          'text-[15px] leading-tight',
                          isActive ? 'font-extrabold' : 'font-[650]',
                        )}
                      >
                        {t(`steps.items.${step.key}.title`)}
                      </strong>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute inset-x-[20%] bottom-0 h-0.75 rounded-full',
                        isActive ? step.hue.underline : 'bg-transparent',
                      )}
                    />
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
          {PUBLISH_STEPS.map((step, index) => (
            <TabsContent
              key={step.key}
              value={step.key}
              className={cn(
                'grid grid-cols-1 gap-6 rounded-[28px] p-5 text-base w767:grid-cols-2 w767:p-8',
                step.hue.panel,
              )}
            >
              <div className="flex flex-col justify-center gap-3.5">
                <p
                  className={cn(
                    'text-caption leading-[1.55] font-extrabold tracking-[0.06em] tabular-nums',
                    step.hue.ink,
                  )}
                >
                  {t('steps.stepOf', { number: index + 1, total: PUBLISH_STEPS.length })}
                </p>
                <h3 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.03em] text-foreground">
                  {t(`steps.items.${step.key}.title`)}
                </h3>
                <p className="text-body text-muted-foreground">
                  {t(`steps.items.${step.key}.text`)}
                </p>
                <ul className="flex flex-col gap-2">
                  {t(`steps.items.${step.key}.points`, { returnObjects: true }).map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2.5 text-[15px] leading-[1.45] text-foreground"
                    >
                      <CheckIcon
                        aria-hidden
                        className={cn('mt-0.5 size-4.5 shrink-0', step.hue.ink)}
                      />
                      {point}
                    </li>
                  ))}
                </ul>
                <p className="flex items-start gap-2.5 rounded-lg bg-card px-3.5 py-3 text-small leading-[1.45] text-foreground">
                  <LightbulbIcon aria-hidden className={cn('size-4.5 shrink-0', step.hue.ink)} />
                  {t(`steps.items.${step.key}.tip`)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => {
                      goTo(index - 1);
                    }}
                    className="border-[1.5px] font-bold"
                  >
                    <ArrowLeftIcon aria-hidden />
                    {t('steps.previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={index === lastIndex}
                    onClick={() => {
                      goTo(index + 1);
                    }}
                    className="border-[1.5px] font-bold"
                  >
                    {t('steps.next')}
                    <ArrowRightIcon aria-hidden />
                  </Button>
                </div>
              </div>
              <StepPreview stepKey={step.key} stepIndex={index} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}

type InfoChipProps = {
  icon: ReactNode;
  title: string;
  text: string;
};

function InfoChip({ icon, title, text }: InfoChipProps) {
  return (
    <span className="flex items-center gap-3 rounded-[14px] border border-border-hairline bg-card px-4 py-3">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-lg bg-step-coral-surface text-step-coral-ink [&_svg]:size-5"
      >
        {icon}
      </span>
      <span className="flex flex-col gap-px">
        <strong className="text-[15px] leading-[1.55] font-bold text-brand">{title}</strong>
        <span className="text-caption leading-[1.55] text-muted-foreground">{text}</span>
      </span>
    </span>
  );
}
