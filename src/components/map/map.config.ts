export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';
export const REPORT_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

export type MapBasemap = 'site' | 'report';

export type LngLat = [longitude: number, latitude: number];
export type LngLatBounds = [southWest: LngLat, northEast: LngLat];

export const LISTING_TILE_ZOOMS = { min: 4, max: 16 } as const;
