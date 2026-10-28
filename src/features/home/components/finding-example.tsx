import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExampleLabel } from '@/components/feedback/example-label';
import { StatusPill } from '@/components/feedback/status-pill';
import { Photo } from '@/components/media/photo';
import { Finding } from '@/components/report/finding';
import { BrandMark } from '@/components/brand/brand-mark';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import windowImage from '@/assets/home/inspection-window.webp';

const EXAMPLES = ['windows', 'damp', 'systems'] as const;
const EXAMPLE_TONE = { windows: 'warning', damp: 'warning', systems: 'success' } as const;
const FIELDS = ['method', 'observation', 'impact', 'recommendation', 'photos'] as const;
const DEFAULT_EXAMPLE = EXAMPLES[0];

export function FindingExample() {
  const { t } = useTranslation('home');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="flex flex-col gap-4">
      <div className="flex flex-col gap-5 rounded-photo bg-primary px-6 py-5.5 text-on-inverse shadow-service sm:flex-row sm:items-center sm:justify-between">
        <BrandMark product="physical" size={44} className="hidden sm:block" />
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-meta font-extrabold tracking-[0.06em] text-cta uppercase">
            {t('physical.finding.kicker')}
          </p>
          <p className="text-[19px] leading-[1.55] font-extrabold tracking-[-0.02em] w520:text-h3">
            {t('physical.finding.title')}
          </p>
          <p className="text-label font-[750] text-on-inverse">{t('physical.finding.text')}</p>
        </div>
        <CollapsibleTrigger className="inline-flex h-12 shrink-0 items-center justify-center gap-2.5 rounded-full bg-cta py-0 pr-2 pl-4.5 text-label font-extrabold text-brand transition-colors hover:bg-cta-hover focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:ring-offset-2 focus-visible:ring-offset-primary focus-visible:outline-none">
          {t(isOpen ? 'physical.finding.close' : 'physical.finding.open')}
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-full bg-primary text-cta"
          >
            <ChevronDownIcon
              className={cn(
                'size-4 transition-transform duration-(--duration-fast)',
                isOpen && 'rotate-180',
              )}
            />
          </span>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="grid grid-cols-1 gap-6 rounded-2xl bg-surface-subtle p-5 ring-1 ring-border-subtle sm:p-8 lg:grid-cols-[2fr_3fr]">
        <div className="flex flex-col gap-4">
          <p className="text-small text-muted-foreground">{t('physical.finding.intro')}</p>
          <Photo
            src={windowImage}
            alt={t('physical.finding.photoAlt')}
            caption={t('physical.finding.photoCaption')}
          />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-eyebrow text-muted-foreground uppercase">
              {t('physical.finding.eyebrow')}
            </p>
            <ExampleLabel label={t('examples.fictional')} />
          </div>
          <h3 className="text-h2">{t('physical.finding.heading')}</h3>
          <p className="text-small text-muted-foreground">{t('physical.finding.reportIntro')}</p>
          <Tabs defaultValue={DEFAULT_EXAMPLE} className="gap-4">
            <TabsList
              aria-label={t('physical.finding.tabsLabel')}
              className="grid h-auto w-full grid-cols-3 gap-1 bg-secondary p-1"
            >
              {EXAMPLES.map((example) => (
                <TabsTrigger
                  key={example}
                  value={example}
                  className="h-11 text-label text-brand data-[state=active]:bg-card data-[state=active]:text-brand"
                >
                  {t(`physical.finding.examples.${example}.tab`)}
                </TabsTrigger>
              ))}
            </TabsList>
            {EXAMPLES.map((example) => (
              <TabsContent key={example} value={example}>
                <Finding
                  reference={t(`physical.finding.examples.${example}.ref`)}
                  title={t(`physical.finding.examples.${example}.title`)}
                  status={
                    <StatusPill
                      tone={EXAMPLE_TONE[example]}
                      label={t(`physical.finding.examples.${example}.status`)}
                    />
                  }
                  fields={FIELDS.map((field) => ({
                    key: field,
                    label: t(`physical.finding.fields.${field}`),
                    value: t(`physical.finding.examples.${example}.${field}`),
                  }))}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
