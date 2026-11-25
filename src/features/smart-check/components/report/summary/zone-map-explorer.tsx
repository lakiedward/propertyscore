import { BusIcon, FootprintsIcon, InfoIcon, LayersIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { REPORT_HUES } from '@/components/report/report-hues';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { walkingTimeMethod } from '../../../fifteen-minute.utils';
import type { ReadyReport } from '../../../report.types';
import { ZONE_LAYERS, type ZoneLayer, type ZoneRoute } from '../../../zone-map.utils';
import { ZoneMap } from './zone-map';

const EXPLORER_MODES = ['walk', 'transit', 'layers'] as const;

type ExplorerMode = (typeof EXPLORER_MODES)[number];

const MODE_ICONS = { walk: FootprintsIcon, transit: BusIcon, layers: LayersIcon } as const;

const LAYER_SWATCHES: Readonly<Record<ZoneLayer, string>> = {
  green: 'bg-report-green',
  fifteen: 'bg-report-fifteen-minute',
  ring: 'bg-report-summary',
};

function isExplorerMode(value: string): value is ExplorerMode {
  return EXPLORER_MODES.some((mode) => mode === value);
}

type ZoneMapExplorerProps = {
  report: ReadyReport;
  walk: readonly ZoneRoute[];
  transit: readonly ZoneRoute[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function ZoneMapExplorer({
  report,
  walk,
  transit,
  isOpen,
  onOpenChange,
}: ZoneMapExplorerProps) {
  const { t } = useTranslation('smartCheck');
  const [mode, setMode] = useState<ExplorerMode>('walk');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [layers, setLayers] = useState<readonly ZoneLayer[]>([]);
  const routes = mode === 'transit' ? transit : walk;
  const walkMethod = walkingTimeMethod(report.result.sections.fifteen_minute?.distance_method);
  const walkNote =
    walk.length > 0 ? 'routed' : walkMethod === 'estimated' ? 'estimated' : 'unavailable';

  const toggleLayer = (layer: ZoneLayer) => {
    setLayers((current) =>
      current.includes(layer) ? current.filter((item) => item !== layer) : [...current, layer],
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-svh max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-card p-0 text-foreground ring-0 sm:max-w-none"
      >
        <div className="flex h-16 flex-none items-center justify-between gap-3 border-b border-border-subtle pr-4 pl-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark product="smartcheck" size={28} />
            <DialogTitle className="text-[17px] font-extrabold">
              {t('report.chapters.summary.explorer.title')}
            </DialogTitle>
            <DialogDescription className="hidden truncate text-small text-muted-foreground w960:block">
              {report.address_text}
            </DialogDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="size-11 rounded-thumb border-border text-brand"
            aria-label={t('report.chapters.summary.explorer.close')}
            onClick={() => {
              onOpenChange(false);
            }}
          >
            <XIcon aria-hidden className="size-5.5" />
          </Button>
        </div>
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1.2fr)_minmax(0,1fr)] w960:grid-cols-[380px_minmax(0,1fr)] w960:grid-rows-1">
          <div className="flex min-h-0 min-w-0 flex-col border-t border-border-subtle bg-card w960:order-first w960:border-t-0 w960:border-r">
            <div className="border-b border-border-subtle px-4.5 pt-4.5 pb-3">
              <p className="text-meta font-extrabold tracking-label text-report-hero uppercase">
                {t('report.chapters.summary.explorer.title')}
              </p>
              <h3 className="mt-1 text-[19px] font-extrabold tracking-[-0.01em]">
                {t('report.chapters.summary.explorer.heading')}
              </h3>
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(value) => {
                  if (isExplorerMode(value)) {
                    setMode(value);
                    setSelectedRouteId(null);
                  }
                }}
                aria-label={t('report.chapters.summary.explorer.modes')}
                className="mt-3 flex w-full gap-0.5 rounded-thumb bg-muted p-0.75"
              >
                {EXPLORER_MODES.map((option) => {
                  const Icon = MODE_ICONS[option];
                  return (
                    <ToggleGroupItem
                      key={option}
                      value={option}
                      className="inline-flex h-auto flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[13.5px] font-bold text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-brand data-[state=on]:shadow-segment"
                    >
                      <Icon aria-hidden className="size-4" />
                      {t(`report.chapters.summary.explorer.${option}`)}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pt-1.5 pb-2.5">
              <p className="px-1.5 pt-2 pb-1.5 text-caption leading-compact text-muted-foreground">
                {mode === 'walk'
                  ? t(`report.chapters.summary.explorer.walkNote.${walkNote}`)
                  : t(`report.chapters.summary.explorer.${mode}Note`)}
              </p>
              {mode === 'layers' ? (
                <ul>
                  {ZONE_LAYERS.map((layer) => {
                    const isOn = layers.includes(layer);
                    return (
                      <li key={layer}>
                        <button
                          type="button"
                          aria-pressed={isOn}
                          onClick={() => {
                            toggleLayer(layer);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-md px-2 py-2.5 text-left text-[14.5px] font-bold text-foreground hover:bg-surface-highlight focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <i
                            aria-hidden="true"
                            className={cn('size-3.5 flex-none rounded-sm', LAYER_SWATCHES[layer])}
                          />
                          {t(`report.chapters.summary.explorer.layerNames.${layer}`)}
                          <span
                            aria-hidden="true"
                            className={cn(
                              'relative ml-auto h-5 w-8.5 rounded-full transition-colors duration-(--duration-fast)',
                              isOn ? 'bg-primary' : 'bg-muted',
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-0.75 left-0.75 size-3.5 rounded-full bg-card shadow-sm transition-transform duration-(--duration-fast) ease-standard',
                                isOn && 'translate-x-3.5',
                              )}
                            />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : routes.length > 0 ? (
                <ul>
                  {routes.map((route) => {
                    const isSelected = selectedRouteId === route.id;
                    const name =
                      route.name ??
                      (route.group === null
                        ? ''
                        : t(`report.chapters.summary.explorer.placeKinds.${route.group}`));
                    const hue = REPORT_HUES[route.hue];
                    return (
                      <li key={route.id}>
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          aria-label={t('report.chapters.summary.explorer.routeLabel', {
                            name,
                            minutes: route.minutes,
                          })}
                          onClick={() => {
                            setSelectedRouteId(isSelected ? null : route.id);
                          }}
                          className={cn(
                            'grid w-full grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-md px-2 py-2.5 text-left text-[14.5px] font-semibold transition-colors duration-(--duration-fast) hover:bg-surface-highlight focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none',
                            isSelected && 'bg-surface-highlight',
                          )}
                        >
                          <i aria-hidden="true" className={cn('size-3 rounded-full', hue.fill)} />
                          <span className="truncate">{name}</span>
                          <b className={cn('text-body tabular-nums', hue.text)}>
                            {t('report.chapters.summary.explorer.minutes', {
                              minutes: route.minutes,
                            })}
                          </b>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : mode === 'transit' ? (
                <p className="px-1.5 py-2 text-small text-muted-foreground">
                  {t('report.chapters.summary.explorer.empty')}
                </p>
              ) : null}
            </div>
            {mode !== 'layers' && routes.length > 0 ? (
              <p className="flex items-start gap-2 border-t border-border-subtle px-4 py-2.75 text-[12.5px] leading-[1.4] text-muted-foreground">
                <InfoIcon aria-hidden className="mt-px size-4 flex-none" />
                {t('report.chapters.summary.explorer.footer')}
              </p>
            ) : null}
          </div>
          <div className="relative order-first min-h-0 min-w-0 bg-report-map-land w960:order-none">
            {isOpen ? (
              <ZoneMap
                report={report}
                routes={mode === 'layers' ? [] : routes}
                selectedRouteId={selectedRouteId}
                layers={layers}
                hasZoomControls
                className="rounded-none"
              />
            ) : null}
            <div className="absolute bottom-3 left-3 z-3 hidden rounded-thumb border border-border-subtle bg-card/96 px-3 py-2 text-meta shadow-report-label w960:block">
              <p className="font-extrabold text-foreground">
                {t('report.chapters.summary.explorer.legendTitle')}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-muted-foreground">
                <i aria-hidden="true" className="size-2.5 rounded-full bg-primary" />
                {t('report.chapters.summary.explorer.legendAddress')}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
