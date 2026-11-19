import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ListIcon, MapIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LazyMapCanvas } from '@/components/map/lazy-map-canvas';
import type {
  MapCanvasController,
  MapFocus,
  MapMarkerItem,
  MapRegions,
} from '@/components/map/map-canvas';
import { MapPin } from '@/components/map/map-pin';
import { boundsOfPolygons } from '@/components/map/map.utils';
import type { MapListingTiles, MapTilePin } from '@/components/map/use-map-listing-tiles';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DEFAULT_TRANSACTION } from '@/config/home-search';
import {
  DEFAULT_EXPLORER_SORT,
  EXPLORER_CITIES,
  EXPLORER_MAP_LAYOUT,
  ROMANIA_BOUNDS,
  ROMANIA_CENTER,
  ROMANIA_ZOOM,
  type ExplorerCityId,
  type ExplorerSort,
} from '@/config/listings-explorer';
import { formatNumber, formatPrice, formatPriceInThousands, toCurrency } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { listingQueries } from '../api/listings.queries';
import { getListingMediumUrl } from '../api/listings.storage';
import { LISTING_TILE_HEADERS, listingTileUrl } from '../api/listings.tiles';
import { useDebouncedBounds } from '../hooks/use-debounced-bounds';
import { useFullScreen } from '../hooks/use-full-screen';
import { useIsNarrowScreen } from '../hooks/use-is-narrow-screen';
import type { ListingTransaction } from '../listing.types';
import { toMapRegions, toTilePin } from '../listing.utils';
import { ListingMapPopup } from './listing-map-popup';
import { ListingMapSheet } from './listing-map-sheet';
import {
  ListingsExplorerList,
  type ExplorerEmptyKind,
  type ExplorerListing,
} from './listings-explorer-list';
import { ListingsMapControls } from './listings-map-controls';
import { ListingsMapFilters } from './listings-map-filters';

const SHOW_ON_MAP_ZOOM = 16;

const PRICE_STEP = { sale: 1000, rent: 1 } as const satisfies Record<ListingTransaction, number>;

type MapPopupContent = {
  id: string;
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
  const { isFullScreen, setIsFullScreen } = useFullScreen();
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
    id: string;
    photo_path: string | null;
    title: string;
    street_label: string;
    city: string;
    price: number;
    currency: string;
  }): MapPopupContent => ({
    id: listing.id,
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
    const regionBounds = region ? boundsOfPolygons(region.coordinates) : undefined;
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
      sort: DEFAULT_EXPLORER_SORT,
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
    setSelected({ ...toTilePin(listing), content: popupContentOf(listing) });
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
    setHovered(listing ? toTilePin(listing) : undefined);
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

  const mapRegions: MapRegions | undefined = regions.data
    ? {
        ...toMapRegions({
          shapes: regions.data,
          counties: summary.data?.counties ?? [],
          selectedId: city?.regionId,
          labelOf: (region, count) =>
            region.id === 'bucuresti'
              ? t('explore.region.bucharest', { count })
              : t('explore.region.county', { name: region.name, count }),
        }),
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
      <MapPin
        kind="brand"
        shape="tag"
        label={pinLabel(listing.price, listing.currency)}
        accessibleName={fullPrice(listing.price, listing.currency)}
        isActive={state === 'hovered'}
        isSelected={state === 'selected'}
      />
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
    priceStep: PRICE_STEP[transaction],
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
            : 'relative h-[calc(100dvh-var(--header-height)-1px)] min-h-120 border-b border-map-edge',
        )}
      >
        <LazyMapCanvas
          ref={mapRef}
          label={t('explore.mapLabel')}
          center={ROMANIA_CENTER}
          zoom={ROMANIA_ZOOM}
          bounds={ROMANIA_BOUNDS}
          boundsPadding={EXPLORER_MAP_LAYOUT.boundsPadding}
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
          onError={() => {
            setHasMapError(true);
          }}
          errorFallback={
            <Alert className="absolute inset-x-4 top-1/2 z-10 -translate-y-1/2">
              <AlertDescription>{t('explore.mapError')}</AlertDescription>
            </Alert>
          }
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
        <ListingsMapControls
          isFullScreen={isFullScreen}
          onFullScreenToggle={handleFullScreenToggle}
          onShowRomania={showRomania}
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
        />
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
      <ListingMapSheet
        label={t('explore.popup.label')}
        isOpen={selected !== undefined && isNarrow}
        onClose={clearSelection}
      >
        <ListingMapPopup
          variant="sheet"
          listing={selectedContent}
          isRent={transaction === 'rent'}
          onClose={clearSelection}
        />
      </ListingMapSheet>
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
