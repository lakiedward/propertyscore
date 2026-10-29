import { getRouteApi } from '@tanstack/react-router';
import {
  ArrowUpRightIcon,
  CameraIcon,
  FileTextIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ExampleLabel } from '@/components/feedback/example-label';
import { StatusPill } from '@/components/feedback/status-pill';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { Photo } from '@/components/media/photo';
import { StatCard } from '@/components/report/stat-card';
import { ScoreValue } from '@/components/trust/score-value';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatNumber, formatPrice } from '@/i18n/format';
import { cn } from '@/lib/utils';
import bathImage from '@/assets/home/room-bath.webp';
import bedroomImage from '@/assets/home/room-bedroom.webp';
import livingImage from '@/assets/home/hero-living.webp';
import windowImage from '@/assets/home/inspection-window.webp';
import { ListingBenefit } from './listing-benefit';
import { PackageBundle } from './package-bundle';
import { ZoneRoutesIllustration } from './zone-routes-illustration';

const routeApi = getRouteApi('/_site/');

const DELIVERABLES = ['report', 'zone', 'visual'] as const;
type Deliverable = (typeof DELIVERABLES)[number];
const [REPORT, ZONE, VISUAL] = DELIVERABLES;
const DEFAULT_DELIVERABLE: Deliverable = REPORT;
const DELIVERABLE_ICON: Readonly<Record<Deliverable, LucideIcon>> = {
  report: FileTextIcon,
  zone: ShieldCheckIcon,
  visual: CameraIcon,
};
const TAB_ACTIVE_CLASS: Readonly<Record<Deliverable, string>> = {
  report:
    'data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
  zone: 'data-[state=active]:border-info data-[state=active]:bg-info data-[state=active]:text-info-foreground',
  visual:
    'data-[state=active]:border-category-health-fill data-[state=active]:bg-category-health-surface data-[state=active]:text-category-health-strong',
};
const TAB_ICON_CLASS: Readonly<Record<Deliverable, string>> = {
  report:
    'bg-surface-alt text-brand group-data-[state=active]/tab:bg-on-inverse/10 group-data-[state=active]/tab:text-cta',
  zone: 'bg-info-border text-info-ink-muted group-data-[state=active]/tab:bg-card group-data-[state=active]/tab:text-info',
  visual:
    'bg-category-health-surface text-category-health-strong group-data-[state=active]/tab:bg-category-health group-data-[state=active]/tab:text-on-inverse',
};
const REPORT_LINE_TONE = ['neutral', 'warning', 'info'] as const;
const VISUAL_LINE_TONE = ['success', 'neutral', 'success'] as const;
const METHOD_ITEM = 'method';
const ROUTES_ITEM = 'routes';
const ZONE_SAFETY_EXAMPLE = 78;
const RENT_EXAMPLE = 500;
const PRICE_EXAMPLE = 120000;
const PRICE_PER_M2_EXAMPLE = 2000;

export function DeliverablesSection() {
  const { t } = useTranslation('home');
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const deliverable = search.deliverable ?? DEFAULT_DELIVERABLE;
  const smartCheckPrice = formatPrice(
    SERVICE_PRICES.smartCheck.amount,
    SERVICE_PRICES.smartCheck.currency,
  );
  const reportLines = t('deliverables.report.lines', { returnObjects: true });
  const visualLines = t('deliverables.visual.lines', { returnObjects: true });
  const chapters = t('deliverables.zone.chapters', { returnObjects: true });
  const method = t('deliverables.zone.method', { returnObjects: true });

  const handleChange = (value: string) => {
    const next = DELIVERABLES.find((option) => option === value);
    if (next) {
      void navigate({
        search: (previous) => ({ ...previous, deliverable: next }),
        replace: true,
        resetScroll: false,
      });
    }
  };

  return (
    <section
      id={HOME_SECTION.deliverables}
      aria-labelledby="deliverables-title"
      className="bg-surface-alt py-13.75 w520:py-17.5 w820:py-26.25"
    >
      <div className="page-wrap flex flex-col">
        <div className="mb-7.5 grid grid-cols-1 items-center gap-x-18 gap-y-7 w1080:grid-cols-[1fr_1.12fr]">
          <div className="flex flex-col gap-7">
            <h2
              id="deliverables-title"
              className="text-[clamp(34px,3.4vw,52px)] leading-[1.1] font-[740] tracking-[-0.04em] text-foreground"
            >
              <span className="block">{t('deliverables.titleLead')}</span>
              <span className="block text-muted-foreground">
                <Trans
                  t={t}
                  i18nKey="deliverables.titleAccent"
                  components={{
                    home: <span className="marker-cta text-brand" />,
                    area: <span className="marker-info text-info" />,
                  }}
                />
              </span>
            </h2>
            <p className="max-w-130 text-lg leading-[1.65] text-ink-soft">
              <strong className="font-bold text-brand">{t('deliverables.leadStrong')}</strong>{' '}
              {t('deliverables.lead')}
            </p>
          </div>
          <PackageBundle />
        </div>

        <Tabs
          value={deliverable}
          onValueChange={handleChange}
          className="gap-0 overflow-hidden rounded-[19px] border border-border bg-card shadow-shell"
        >
          <TabsList
            aria-label={t('deliverables.tabsLabel')}
            className="grid h-auto w-full grid-cols-1 gap-2 rounded-none border-b border-border bg-card p-2 sm:grid-cols-3"
          >
            {DELIVERABLES.map((option) => {
              const Icon = DELIVERABLE_ICON[option];
              return (
                <TabsTrigger
                  key={option}
                  value={option}
                  className={cn(
                    'group/tab h-auto min-w-0 justify-start gap-3 rounded-[10px] border border-transparent p-3.75 text-left whitespace-normal text-brand shadow-none data-[state=active]:shadow-tab',
                    TAB_ACTIVE_CLASS[option],
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid size-11 shrink-0 place-items-center rounded-md',
                      TAB_ICON_CLASS[option],
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span
                      className={cn(
                        'font-black',
                        option === VISUAL ? 'text-label' : 'text-[22px] leading-[1.15]',
                      )}
                    >
                      {t(`deliverables.tabs.${option}.name`)}
                    </span>
                    <span className="mt-1 text-nav-sm font-[450] text-muted-foreground group-data-[state=active]/tab:text-on-info-soft">
                      {t(`deliverables.tabs.${option}.text`)}
                    </span>
                  </span>
                  <ArrowUpRightIcon
                    aria-hidden
                    className="ms-auto hidden size-5 shrink-0 lg:block"
                  />
                </TabsTrigger>
              );
            })}
          </TabsList>
          <div className="bg-card px-7.5 pt-6.5 pb-4.5">
            <TabsContent value={REPORT} className="flex flex-col gap-6">
              <PanelIntro
                eyebrow={t('deliverables.report.eyebrow')}
                lead={t('deliverables.report.titleLead')}
                accent={t('deliverables.report.titleAccent')}
                text={t('deliverables.report.text')}
              />
              <div className="grid grid-cols-1 gap-7 w820:grid-cols-[0.84fr_1.16fr]">
                <figure className="relative min-h-90 overflow-hidden rounded-icon bg-surface-alt">
                  <img
                    src={windowImage}
                    alt={t('deliverables.report.photoAlt')}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 size-full object-cover"
                  />
                  <figcaption className="absolute bottom-3 left-3 rounded-[5px] bg-photo-note px-2.5 py-1.75 text-[10px] leading-normal font-[650] text-foreground">
                    {t('deliverables.report.photoCaption')}
                  </figcaption>
                </figure>
                <div>
                  <div className="mb-3.25 flex items-center justify-between gap-3.5 text-meta text-brand">
                    <p className="font-bold">{t('deliverables.report.listTitle')}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t('deliverables.report.listDate')}
                    </p>
                  </div>
                  <ol className="border-t border-border">
                    {reportLines.map((line, index) => (
                      <li
                        key={line.title}
                        className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-start gap-2.75 border-b border-border py-3.5"
                      >
                        <span className="grid size-8.5 place-items-center rounded-full bg-surface-alt text-meta font-extrabold text-brand tabular-nums">
                          {formatNumber(index + 1, { minimumIntegerDigits: 2 })}
                        </span>
                        <span className="flex flex-col">
                          <span className="text-small font-bold text-foreground">{line.title}</span>
                          <span className="mt-0.5 text-meta text-muted-foreground">
                            {line.text}
                          </span>
                        </span>
                        <span
                          className={cn(
                            'text-nav-sm font-bold',
                            REPORT_LINE_TONE[index] === 'warning'
                              ? 'text-status-attention'
                              : 'text-brand',
                          )}
                        >
                          {line.status}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3.75 rounded-md bg-surface-leaf px-4 py-3.5">
                    <p className="text-meta font-bold text-brand">
                      {t('deliverables.report.boxTitle')}
                    </p>
                    <p className="mt-1.25 max-w-113.5 text-meta leading-[1.65] text-muted-foreground">
                      {t('deliverables.report.boxText')}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value={ZONE} className="flex flex-col gap-6">
              <PanelIntro
                eyebrow={t('deliverables.zone.eyebrow')}
                lead={t('deliverables.zone.titleLead')}
                accent={t('deliverables.zone.titleAccent')}
                text={
                  <Trans
                    t={t}
                    i18nKey="deliverables.zone.text"
                    values={{ price: smartCheckPrice }}
                    components={{ strong: <strong className="font-bold text-foreground" /> }}
                  />
                }
              />
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div
                  role="group"
                  aria-label={t('deliverables.zone.indicatorsLabel')}
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-wrap gap-2">
                    <ExampleLabel label={t('examples.values')} />
                  </div>
                  <p className="text-caption text-muted-foreground">
                    {t('deliverables.zone.comparison')}
                  </p>
                  <div className="flex items-center gap-4 rounded-xl bg-info-surface p-4">
                    <ScoreValue
                      value={ZONE_SAFETY_EXAMPLE}
                      size="md"
                      hue="safety"
                      label={t('deliverables.zone.gaugeLabel', { score: ZONE_SAFETY_EXAMPLE })}
                    />
                    <span className="flex flex-col gap-1">
                      <span className="text-meta font-bold text-muted-foreground uppercase">
                        {t('deliverables.zone.scoreEyebrow')}
                      </span>
                      <span className="text-h4">{t('deliverables.zone.scoreTitle')}</span>
                      <span className="text-caption text-muted-foreground">
                        {t('deliverables.zone.scoreText')}
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <StatCard
                      label={t('deliverables.zone.rentLabel')}
                      value={t('deliverables.zone.rentValue', {
                        price: formatPrice(RENT_EXAMPLE, 'EUR'),
                      })}
                      hint={t('deliverables.zone.rentText')}
                    />
                    <StatCard
                      label={t('deliverables.zone.priceLabel')}
                      value={formatPrice(PRICE_EXAMPLE, 'EUR')}
                      hint={
                        <Trans
                          t={t}
                          i18nKey="deliverables.zone.priceText"
                          values={{ perM2: formatPrice(PRICE_PER_M2_EXAMPLE, 'EUR') }}
                          components={{ strong: <strong className="font-bold text-foreground" /> }}
                        />
                      }
                    />
                  </div>
                  <p className="text-caption text-muted-foreground">
                    {t('deliverables.zone.marketNote')}
                  </p>
                  <div className="flex flex-col gap-2">
                    <p className="text-label">{t('deliverables.zone.chaptersTitle')}</p>
                    <ul className="flex flex-wrap gap-1.5">
                      {chapters.map((chapter) => (
                        <li
                          key={chapter}
                          className="rounded-full bg-surface-alt px-3 py-1 text-caption font-semibold text-brand"
                        >
                          {chapter}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Accordion type="multiple" className="border-t border-border-subtle">
                    <AccordionItem value={METHOD_ITEM} className="border-border-subtle">
                      <AccordionTrigger>{t('deliverables.zone.methodTitle')}</AccordionTrigger>
                      <AccordionContent>
                        <dl className="flex flex-col gap-3">
                          {method.map((item) => (
                            <div key={item.title}>
                              <dt className="font-bold text-foreground">{item.title}</dt>
                              <dd>{item.text}</dd>
                            </div>
                          ))}
                        </dl>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value={ROUTES_ITEM} className="border-border-subtle">
                      <AccordionTrigger>{t('deliverables.zone.routesTitle')}</AccordionTrigger>
                      <AccordionContent>{t('deliverables.zone.routesText')}</AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
                <div className="flex flex-col gap-4">
                  <ZoneRoutesIllustration />
                  <div className="rounded-lg bg-surface-alt p-4">
                    <p className="text-label">{t('deliverables.zone.sourcesTitle')}</p>
                    <p className="text-small text-muted-foreground">
                      {t('deliverables.zone.sourcesText')}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value={VISUAL} className="flex flex-col gap-6">
              <PanelIntro
                eyebrow={t('deliverables.visual.eyebrow')}
                lead={t('deliverables.visual.titleLead')}
                accent={t('deliverables.visual.titleAccent')}
                text={t('deliverables.visual.text')}
              />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-3">
                  <Photo
                    src={livingImage}
                    alt={t('deliverables.visual.photos.living')}
                    ratio="3/2"
                    className="col-span-2"
                  />
                  <Photo
                    src={bedroomImage}
                    alt={t('deliverables.visual.photos.bedroom')}
                    ratio="4/3"
                  />
                  <Photo src={bathImage} alt={t('deliverables.visual.photos.bath')} ratio="4/3" />
                </div>
                <div className="flex flex-col gap-4">
                  <ol className="flex flex-col divide-y divide-border-subtle">
                    {visualLines.map((line, index) => (
                      <li
                        key={line.title}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <span className="flex gap-3">
                          <span className="w-6 font-bold text-muted-foreground tabular-nums">
                            {formatNumber(index + 1, { minimumIntegerDigits: 2 })}
                          </span>
                          <span className="flex flex-col">
                            <span className="text-label">{line.title}</span>
                            <span className="text-small text-muted-foreground">{line.text}</span>
                          </span>
                        </span>
                        <StatusPill
                          tone={VISUAL_LINE_TONE[index] ?? 'neutral'}
                          label={line.status}
                          className="ml-9 sm:ml-0"
                        />
                      </li>
                    ))}
                  </ol>
                  <p className="text-caption text-muted-foreground">
                    {t('deliverables.visual.note')}
                  </p>
                </div>
              </div>
            </TabsContent>
            <p className="mt-6 border-t border-border-subtle pt-4 text-caption text-muted-foreground">
              {t('deliverables.shellNote')}
            </p>
          </div>
        </Tabs>

        <ListingBenefit />
      </div>
    </section>
  );
}

type PanelIntroProps = { eyebrow: string; lead: string; accent: string; text: ReactNode };

function PanelIntro({ eyebrow, lead, accent, text }: PanelIntroProps) {
  return (
    <div className="grid grid-cols-1 items-center gap-x-9.5 gap-y-4 pt-6.25 pb-6 w820:grid-cols-2">
      <div>
        <p className="text-[10px] leading-normal font-bold tracking-[0.07em] text-ink-soft uppercase">
          {eyebrow}
        </p>
        <h3 className="mt-2.5 text-[clamp(27px,2.75vw,37px)] leading-[1.13] font-[710] tracking-[-0.04em] text-foreground">
          <span className="block">{lead}</span>
          <span className="block text-muted-foreground">{accent}</span>
        </h3>
      </div>
      <p className="max-w-127.5 text-small leading-[1.75] text-muted-foreground">{text}</p>
    </div>
  );
}
