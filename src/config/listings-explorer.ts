import type { LngLat, LngLatBounds } from '@/components/map/map.config';
import type { Enums } from '@/lib/supabase/database.types';

export const ROMANIA_BOUNDS: LngLatBounds = [
  [20.26, 43.62],
  [29.7, 48.27],
];

export const EXPLORER_CITIES = [
  {
    id: 'bucuresti',
    name: 'București',
    position: [26.1025, 44.4268],
    zoom: 11.25,
    regionId: 'bucuresti',
  },
  {
    id: 'cluj-napoca',
    name: 'Cluj-Napoca',
    position: [23.6236, 46.7712],
    zoom: 11.75,
    regionId: 'cluj',
  },
  {
    id: 'timisoara',
    name: 'Timișoara',
    position: [21.2257, 45.7537],
    zoom: 11.75,
    regionId: 'timis',
  },
  { id: 'iasi', name: 'Iași', position: [27.6014, 47.1585], zoom: 11.75, regionId: 'iasi' },
  { id: 'brasov', name: 'Brașov', position: [25.5887, 45.6427], zoom: 11.75, regionId: 'brasov' },
  {
    id: 'constanta',
    name: 'Constanța',
    position: [28.6348, 44.1598],
    zoom: 11.75,
    regionId: 'constanta',
  },
  { id: 'oradea', name: 'Oradea', position: [21.9189, 47.0465], zoom: 11.75, regionId: 'bihor' },
  { id: 'sibiu', name: 'Sibiu', position: [24.1256, 45.7983], zoom: 11.75, regionId: 'sibiu' },
  { id: 'craiova', name: 'Craiova', position: [23.7949, 44.3302], zoom: 11.75, regionId: 'dolj' },
  {
    id: 'targu-mures',
    name: 'Târgu Mureș',
    position: [24.5575, 46.5386],
    zoom: 11.75,
    regionId: 'mures',
  },
] as const satisfies readonly {
  id: string;
  name: string;
  position: LngLat;
  zoom: number;
  regionId: string;
}[];

type ExplorerCity = (typeof EXPLORER_CITIES)[number];

export type ExplorerCityId = ExplorerCity['id'];

export const EXPLORER_CITY_IDS = EXPLORER_CITIES.map((city) => city.id);

export const EXPLORER_PRICE_CAPS: Readonly<
  Record<Enums<'listing_transaction'>, readonly number[]>
> = {
  sale: [100_000, 150_000, 200_000],
  rent: [400, 600, 800],
};

export const EXPLORER_PRICE_CAP_CURRENCY = 'EUR';

export const EXPLORER_SORTS = ['relevance', 'newest', 'priceAsc', 'priceDesc', 'area'] as const;

export type ExplorerSort = (typeof EXPLORER_SORTS)[number];

export const DEFAULT_EXPLORER_SORT: ExplorerSort = 'relevance';
