import { getRouteApi } from '@tanstack/react-router';
import { cva } from 'class-variance-authority';
import { ArrowUpRightIcon, CameraIcon, FileTextIcon, ShieldCheckIcon } from 'lucide-react';
import type { JSX } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DEFAULT_DELIVERABLE, HOME_DELIVERABLES, type HomeDeliverable } from '@/config/home-search';
import { oneOf } from '@/lib/utils';
import { useBrandNames } from '../hooks/use-brand-names';
import { ListingBenefit } from './listing-benefit';
import { PackageBundle } from './package-bundle';
import { ReportPanel } from './report-panel';
import { SectionTitle } from './section-title';
import { VisualPanel } from './visual-panel';
import { ZonePanel } from './zone-panel';

const routeApi = getRouteApi('/_site/');

const DELIVERABLE_ICON = {
  report: FileTextIcon,
  zone: ShieldCheckIcon,
  visual: CameraIcon,
} as const satisfies Record<HomeDeliverable, typeof FileTextIcon>;

const DELIVERABLE_PANEL = {
  report: ReportPanel,
  zone: ZonePanel,
  visual: VisualPanel,
} as const satisfies Record<HomeDeliverable, () => JSX.Element>;

const tabVariants = cva(
  'group/tab h-auto min-w-0 justify-start gap-3 rounded-thumb border border-transparent p-3.75 text-left whitespace-normal text-brand shadow-none data-[state=active]:shadow-tab',
  {
    variants: {
      deliverable: {
        report:
          'data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
        zone: 'data-[state=active]:border-info data-[state=active]:bg-info data-[state=active]:text-info-foreground',
        visual:
          'data-[state=active]:border-category-health-fill data-[state=active]:bg-category-health-surface data-[state=active]:text-category-health-strong',
      },
    },
  },
);

const tabIconVariants = cva('grid size-11 shrink-0 place-items-center rounded-md', {
  variants: {
    deliverable: {
      report:
        'bg-surface-alt text-brand group-data-[state=active]/tab:bg-on-inverse/10 group-data-[state=active]/tab:text-cta',
      zone: 'bg-info-border text-info-ink-muted group-data-[state=active]/tab:bg-card group-data-[state=active]/tab:text-info',
      visual:
        'bg-category-health-surface text-category-health-strong group-data-[state=active]/tab:bg-category-health group-data-[state=active]/tab:text-on-inverse',
    },
  },
});

const tabNameVariants = cva('font-black', {
  variants: {
    deliverable: {
      report: 'text-[22px] leading-[1.15]',
      zone: 'text-[22px] leading-[1.15]',
      visual: 'text-label',
    },
  },
});

export function DeliverablesSection() {
  const { t } = useTranslation('home');
  const brands = useBrandNames();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const deliverable = search.deliverable ?? DEFAULT_DELIVERABLE;
  const tabNames = {
    report: brands.physical,
    zone: brands.smartCheck,
    visual: t('deliverables.tabs.visual.name'),
  } satisfies Record<HomeDeliverable, string>;

  const handleChange = (value: string) => {
    const next = oneOf(HOME_DELIVERABLES, value);
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
            <SectionTitle
              id="deliverables-title"
              size="deliverables"
              className="text-foreground"
              accentClassName="text-muted-foreground"
              lead={t('deliverables.titleLead')}
              accent={
                <Trans
                  t={t}
                  i18nKey="deliverables.titleAccent"
                  components={{
                    home: <span className="marker-cta text-brand" />,
                    area: <span className="marker-info text-info" />,
                  }}
                />
              }
            />
            <p className="max-w-130 text-lg leading-[1.65] text-ink-soft">
              <Trans
                t={t}
                i18nKey="deliverables.lead"
                values={brands}
                components={{ strong: <strong className="font-bold text-brand" /> }}
              />
            </p>
          </div>
          <PackageBundle />
        </div>

        <Tabs
          value={deliverable}
          onValueChange={handleChange}
          className="gap-0 overflow-hidden rounded-panel border border-border bg-card shadow-shell"
        >
          <TabsList
            aria-label={t('deliverables.tabsLabel')}
            className="grid h-auto w-full grid-cols-1 gap-2 rounded-none border-b border-border bg-card p-2 sm:grid-cols-3"
          >
            {HOME_DELIVERABLES.map((option) => {
              const Icon = DELIVERABLE_ICON[option];
              return (
                <TabsTrigger
                  key={option}
                  value={option}
                  className={tabVariants({ deliverable: option })}
                >
                  <span aria-hidden="true" className={tabIconVariants({ deliverable: option })}>
                    <Icon className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className={tabNameVariants({ deliverable: option })}>
                      {tabNames[option]}
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
            {HOME_DELIVERABLES.map((option) => {
              const Panel = DELIVERABLE_PANEL[option];
              return (
                <TabsContent key={option} value={option} className="flex flex-col gap-6">
                  <Panel />
                </TabsContent>
              );
            })}
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
