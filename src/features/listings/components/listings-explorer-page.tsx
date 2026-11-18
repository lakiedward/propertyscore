import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  ListIcon,
  LocateFixedIcon,
  MapIcon,
  Maximize2Icon,
  Minimize2Icon,
  MinusIcon,
  PlusIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LazyMapCanvas } from '@/components/map/lazy-map-canvas';
import type {
  MapCanvasController,
  MapFocus,
  MapListingTiles,
  MapMarkerItem,
  MapRegions,
  MapTilePin,
} from '@/components/map/map-canvas';
import { MapPin } from '@/components/map/map-pin';
import type { LngLat } from '@/components/map/map.config';
import { boundsOf } from '@/components/map/map.utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DEFAULT_TRANSACTION } from '@/config/home-search';
import {
  EXPLORER_CITIES,
  ROMANIA_BOUNDS,
  type ExplorerCityId,
  type ExplorerSort,
} from '@/config/listings-explorer';
import { formatNumber, formatPrice, formatPriceInThousands, toCurrency } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { listingQueries } from '../api/listings.queries';
import { getListingMediumUrl } from '../api/listings.storage';
import { LISTING_TILE_HEADERS, listingTileUrl } from '../api/listings.tiles';
import { useDebouncedBounds } from '../hooks/use-debounced-bounds';
import { useIsNarrowScreen } from '../hooks/use-is-narrow-screen';
import type { ListingTransaction } from '../listing.types';
import { ListingMapPopup } from './listing-map-popup';
import {
  ListingsExplorerList,
  type ExplorerEmptyKind,
  type ExplorerListing,
} from './listings-explorer-list';
import { ListingsMapFilters } from './listings-map-filters';

const SHOW_ON_MAP_ZOOM = 16;

type MapPopupContent = {
  photoUrl: string | undefined;
  title: string;
  address: string;
  price: string;
};

type HighlightedListing = MapTilePin & { content?: MapPopupContent };

type ListingsExplorerSearch = {
  transaction: ListingTransaction;
  city: ExplorerCityId | undefined;
  maxPrice: number | undefined;
  sort: ExplorerSort;
};

type ListingsExplorerPageProps = {
  search: ListingsExplorerSearch;
  onSearchChange: (patch: Partial<ListingsExplorerSearch>) => void;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function cityFocus(cityId: ExplorerCityId | undefined, requestId: number): MapFocus | undefined {
  const city = EXPLORER_CITIES.find((candidate) => candidate.id === cityId);
  return city ? { position: city.position, zoom: city.zoom, requestId } : undefined;
}

export function ListingsExplorerPage({ search, onSearchChange }: ListingsExplorerPageProps) {
  const { t, i18n } = useTranslation(['listings', 'common']);
  const queryClient = useQueryClient();
  const { transaction, city: cityId, maxPrice, sort } = search;
  const summary = useQuery({
    ...listingQueries.mapSummary({ transaction, maxPrice }),
    placeholderData: keepPreviousData,
  });
  const regions = useQuery(listingQueries.romaniaRegions());
  const { bounds, handleViewportChange } = useDebouncedBounds();
  const [isInView, setIsInView] = useState(true);
  const [hasMapError, setHasMapError] = useState(false);
  const [selected, setSelected] = useState<HighlightedListing>();
  const [hovered, setHovered] = useState<HighlightedListing>();
  const selectedCard = useQuery({
    ...listingQueries.mapCard(selected?.id ?? ''),
    enabled: selected !== undefined && selected.content === undefined,
  });
  const [focus, setFocus] = useState<MapFocus | undefined>(() => cityFocus(cityId, 1));
  const [isFullScreen, setIsFullScreen] = useState(false);
  const mapRef = useRef<MapCanvasController>(null);
  const mapAreaRef = useRef<HTMLDivElement>(null);
  const isNarrow = useIsNarrowScreen();

  const tracksMapArea = isInView && !hasMapError;
  const cards = useInfiniteQuery({
    ...listingQueries.explorer({
      transaction,
      bounds: tracksMapArea ? bounds : undefined,
      maxPrice,
      sort,
    }),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!isFullScreen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullScreen]);

  const shownCount = summary.data?.total;
  const city = EXPLORER_CITIES.find((candidate) => candidate.id === cityId);
  const canReset =
    transaction !== DEFAULT_TRANSACTION || cityId !== undefined || maxPrice !== undefined;

  const pinLabel = (price: number, currency: string) =>
    transaction === 'sale'
      ? formatPriceInThousands(price, toCurrency(currency))
      : formatPrice(price, toCurrency(currency));
  const fullPrice = (price: number, currency: string) => formatPrice(price, toCurrency(currency));
  const addressOf = (street: string, town: string) => t('explore.address', { street, city: town });
  const popupContentOf = (listing: {
    photo_path: string | null;
    title: string;
    street_label: string;
    city: string;
    price: number;
    currency: string;
  }): MapPopupContent => ({
    photoUrl: listing.photo_path ? getListingMediumUrl(listing.photo_path) : undefined,
    title: listing.title,
    address: addressOf(listing.street_label, listing.city),
    price: fullPrice(listing.price, listing.currency),
  });
  const selectedContent =
    selected?.content ??
    (selectedCard.data && selectedCard.data.id === selected?.id
      ? popupContentOf(selectedCard.data)
      : undefined);
  const clearSelection = () => {
    setSelected(undefined);
  };

  const showRomania = () => {
    onSearchChange({ city: undefined });
    mapRef.current?.fitBounds(ROMANIA_BOUNDS);
  };

  const flyToCity = (nextCityId: ExplorerCityId | undefined) => {
    onSearchChange({ city: nextCityId });
    const next = cityFocus(nextCityId, (focus?.requestId ?? 0) + 1);
    if (next) {
      setFocus(next);
    } else {
      mapRef.current?.fitBounds(ROMANIA_BOUNDS);
    }
  };

  const handleRegionSelect = (regionId: string) => {
    const regionCity = EXPLORER_CITIES.find((candidate) => candidate.regionId === regionId);
    if (regionCity) {
      flyToCity(regionCity.id);
      return;
    }
    const region = regions.data?.regions.find((candidate) => candidate.id === regionId);
    const regionBounds = region
      ? boundsOf(
          region.coordinates.flatMap((polygon) =>
            (polygon[0] ?? []).map(([longitude, latitude]): LngLat => [longitude, latitude]),
          ),
        )
      : undefined;
    if (regionBounds) {
      mapRef.current?.fitBounds(regionBounds);
    }
  };

  const handleTransactionChange = (next: ListingTransaction) => {
    setSelected(undefined);
    setHovered(undefined);
    onSearchChange({ transaction: next, maxPrice: undefined });
  };

  const handleReset = () => {
    setSelected(undefined);
    setIsInView(true);
    onSearchChange({
      transaction: DEFAULT_TRANSACTION,
      city: undefined,
      maxPrice: undefined,
      sort: 'relevance',
    });
    mapRef.current?.fitBounds(ROMANIA_BOUNDS);
  };

  const handleCardSelect = (listing: ExplorerListing) => {
    if (!isFullScreen) {
      mapAreaRef.current?.scrollIntoView({
        block: 'end',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
    setSelected({
      id: listing.id,
      position: [listing.longitude, listing.latitude],
      price: listing.price,
      currency: listing.currency,
      content: popupContentOf(listing),
    });
    setFocus((previous) => ({
      position: [listing.longitude, listing.latitude],
      zoom: SHOW_ON_MAP_ZOOM,
      requestId: (previous?.requestId ?? 0) + 1,
    }));
  };

  const handleCardHover = (id: string | undefined) => {
    const listing = cards.data?.pages
      .flatMap((page) => page.items)
      .find((candidate) => candidate.id === id);
    setHovered(
      listing
        ? {
            id: listing.id,
            position: [listing.longitude, listing.latitude],
            price: listing.price,
            currency: listing.currency,
          }
        : undefined,
    );
  };

  const handlePinHover = (pin: MapTilePin | undefined) => {
    setHovered(pin);
    if (pin) {
      void queryClient.query(listingQueries.mapCard(pin.id)).catch(() => undefined);
    }
  };

  const handleFullScreenToggle = () => {
    if (isFullScreen) {
      setSelected(undefined);
    }
    setIsFullScreen((current) => !current);
  };

  const regionCounts = Object.fromEntries(
    (summary.data?.counties ?? []).map((county) => [county.county_id, county.listing_count]),
  );
  const busiestRegion = Math.max(1, ...Object.values(regionCounts));
  const mapRegions: MapRegions | undefined = regions.data
    ? {
        outline: regions.data.outline,
        areas: regions.data.regions.map((region) => {
          const count = regionCounts[region.id] ?? 0;
          return {
            id: region.id,
            coordinates: region.coordinates,
            weight: count / busiestRegion,
            label:
              region.id === 'bucuresti'
                ? t('explore.region.bucharest', { count })
                : t('explore.region.county', { name: region.name, count }),
          };
        }),
        selectedId: city?.regionId,
        onSelect: handleRegionSelect,
      }
    : undefined;

  const highlightMarker = (
    listing: HighlightedListing,
    state: 'hovered' | 'selected',
  ): MapMarkerItem => ({
    id: `${state}-${listing.id}`,
    position: listing.position,
    anchor: 'bottom',
    isRaised: true,
    node: (
      <div inert>
        <MapPin
          kind="brand"
          shape="tag"
          label={pinLabel(listing.price, listing.currency)}
          accessibleName={fullPrice(listing.price, listing.currency)}
          isActive={state === 'hovered'}
          isSelected={state === 'selected'}
          onSelect={() => undefined}
        />
      </div>
    ),
  });

  const highlightMarkers: MapMarkerItem[] = [
    ...(hovered && hovered.id !== selected?.id ? [highlightMarker(hovered, 'hovered')] : []),
    ...(selected ? [highlightMarker(selected, 'selected')] : []),
  ];

  const popupMarkers: MapMarkerItem[] =
    selected && !isNarrow
      ? [
          {
            id: `popup-${selected.id}`,
            position: selected.position,
            anchor: 'bottom',
            isRaised: true,
            node: (
              <div className="pb-11">
                <ListingMapPopup
                  variant="popup"
                  listing={selectedContent}
                  isRent={transaction === 'rent'}
                  onClose={clearSelection}
                />
              </div>
            ),
          },
        ]
      : [];

  const listingTiles: MapListingTiles = {
    url: listingTileUrl({ transaction, maxPrice }),
    headers: LISTING_TILE_HEADERS,
    labelKey: `${i18n.language}-${transaction}`,
    pinLabel,
    bubbleLabel: formatNumber,
    hiddenIds: [hovered?.id, selected?.id].filter((id) => id !== undefined),
    onPinHover: handlePinHover,
    onPinSelect: (pin) => {
      setSelected(pin);
    },
  };

  const emptyKind: ExplorerEmptyKind =
    shownCount === 0 && maxPrice === undefined
      ? 'none'
      : tracksMapArea && shownCount !== undefined && shownCount > 0
        ? 'outside'
        : 'filters';

  return (
    <div className="pb-24">
      <h1 className="sr-only">{t(`explore.title.${transaction}`)}</h1>
      <div
        ref={mapAreaRef}
        className={cn(
          'overflow-hidden bg-map-water',
          isFullScreen
            ? 'fixed inset-0 z-200 h-dvh'
            : 'relative h-[calc(100dvh-77px)] min-h-120 border-b border-map-edge',
        )}
      >
        <LazyMapCanvas
          ref={mapRef}
          label={t('explore.mapLabel')}
          center={ROMANIA_CENTER}
          zoom={COUNTRY_ZOOM}
          bounds={ROMANIA_BOUNDS}
          boundsPadding={10}
          focus={focus}
          markers={[...highlightMarkers, ...popupMarkers]}
          regions={mapRegions}
          hidesPointsOfInterest
          isScrollZoomEnabled
          hasCooperativeGestures={!isFullScreen}
          hasNavigationControl={false}
          onViewportChange={handleViewportChange}
          listingTiles={listingTiles}
          className="absolute inset-0 rounded-none bg-map-water"
          fallbackClassName="absolute inset-0 rounded-none"
          errorFallback={<MapErrorNotice message={t('explore.mapError')} onShow={setHasMapError} />}
        />
        <ListingsMapFilters
          transaction={transaction}
          cityId={cityId}
          maxPrice={maxPrice}
          shownCount={shownCount}
          canReset={canReset}
          onTransactionChange={handleTransactionChange}
          onCityChange={flyToCity}
          onMaxPriceChange={(next) => {
            setSelected(undefined);
            onSearchChange({ maxPrice: next });
          }}
          onReset={handleReset}
        />
        <div className="absolute top-3.5 right-3.5 z-10 flex flex-col items-end gap-2.5 max-w760:top-auto max-w760:bottom-35">
          <MapControlButton
            label={
              isFullScreen ? t('explore.controls.exitFullScreen') : t('explore.controls.fullScreen')
            }
            isPressed={isFullScreen}
            onClick={handleFullScreenToggle}
          >
            {isFullScreen ? <Minimize2Icon aria-hidden /> : <Maximize2Icon aria-hidden />}
          </MapControlButton>
          <MapControlButton label={t('explore.controls.showRomania')} onClick={showRomania}>
            <LocateFixedIcon aria-hidden />
          </MapControlButton>
        </div>
        <div className="absolute right-3.5 bottom-7 z-10 flex flex-col overflow-hidden rounded-thumb border border-border bg-card shadow-map-control">
          <button
            type="button"
            aria-label={t('explore.controls.zoomIn')}
            onClick={() => mapRef.current?.zoomIn()}
            className={ZOOM_BUTTON_CLASS}
          >
            <PlusIcon aria-hidden className="size-5.5" />
          </button>
          <button
            type="button"
            aria-label={t('explore.controls.zoomOut')}
            onClick={() => mapRef.current?.zoomOut()}
            className={cn(ZOOM_BUTTON_CLASS, 'border-t border-border')}
          >
            <MinusIcon aria-hidden className="size-5.5" />
          </button>
        </div>
      </div>
      <div className="mx-auto flex w-[min(1480px,calc(100%-48px))] flex-col pt-7">
        <ListingsExplorerList
          transaction={transaction}
          data={cards.data}
          allCount={shownCount}
          isInView={tracksMapArea}
          isLoading={!cards.data && !cards.isError}
          hasError={(cards.isError && !cards.data) || (summary.isError && !summary.data)}
          emptyKind={emptyKind}
          hasNextPage={cards.hasNextPage}
          isFetchingNextPage={cards.isFetchingNextPage}
          sort={sort}
          activeId={selected?.id}
          onInViewChange={setIsInView}
          onSortChange={(next) => {
            onSearchChange({ sort: next });
          }}
          onLoadMore={() => void cards.fetchNextPage()}
          onRetry={() => {
            void summary.refetch();
            void cards.refetch();
          }}
          onEmptyAction={() => {
            if (emptyKind === 'outside') {
              showRomania();
            } else {
              handleReset();
            }
          }}
          onSelect={handleCardSelect}
          onHoverChange={handleCardHover}
        />
        <p className="mt-10 max-w-162.5 text-meta leading-copy text-muted-foreground">
          {t('explore.mapNote')}
        </p>
      </div>
      {selected && isNarrow ? (
        <div
          role="dialog"
          aria-label={t('explore.popup.label')}
          className="fixed inset-x-0 bottom-0 z-220 rounded-t-xl bg-card px-4 pt-4.5 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-map-sheet"
        >
          <ListingMapPopup
            variant="sheet"
            listing={selectedContent}
            isRent={transaction === 'rent'}
            onClose={clearSelection}
          />
        </div>
      ) : null}
      <button
        type="button"
        onClick={handleFullScreenToggle}
        className="fixed bottom-4.5 left-1/2 z-210 hidden h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-5 text-small font-action text-primary-foreground shadow-map-toggle focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none max-w760:inline-flex"
      >
        {isFullScreen ? (
          <ListIcon aria-hidden className="size-5" />
        ) : (
          <MapIcon aria-hidden className="size-5" />
        )}
        {isFullScreen ? t('explore.showList') : t('explore.showMap')}
      </button>
    </div>
  );
}

const ROMANIA_CENTER: LngLat = [24.98, 45.94];
const COUNTRY_ZOOM = 6;

const ZOOM_BUTTON_CLASS =
  'grid size-12 place-items-center bg-card text-brand transition-colors duration-(--duration-fast) hover:bg-surface-alt focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset';

type MapControlButtonProps = {
  label: string;
  isPressed?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function MapControlButton({ label, isPressed, onClick, children }: MapControlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isPressed}
      onClick={onClick}
      className="grid size-12 place-items-center rounded-thumb border border-border bg-card text-brand shadow-map-control transition-colors duration-(--duration-fast) hover:bg-surface-alt focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none [&_svg]:size-5"
    >
      {children}
    </button>
  );
}

type MapErrorNoticeProps = {
  message: string;
  onShow: (hasError: boolean) => void;
};

function MapErrorNotice({ message, onShow }: MapErrorNoticeProps) {
  useEffect(() => {
    onShow(true);
  }, [onShow]);

  return (
    <Alert className="absolute inset-x-4 top-1/2 z-10 -translate-y-1/2">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
