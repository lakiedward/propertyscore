export const TRANSIT_MODES = ['bus', 'trolleybus', 'tram', 'subway'] as const;

export type TransitMode = (typeof TRANSIT_MODES)[number];

export type LngLat = { lng: number; lat: number };

export type TransitStop = LngLat & {
  key: string;
  name: string | null;
  modes: TransitMode[];
  wheelchairBoarding: number | null;
};

export type TransitRoute = {
  key: string;
  ref: string | null;
  mode: TransitMode;
  longName: string | null;
  colour: string | null;
  textColour: string | null;
  lines: LngLat[][];
};

export type TransitPattern = {
  routeKey: string;
  directionLabel: string;
  stopKeys: string[];
  stopDeparturesPerHour: number[] | null;
};

export type TransitNetwork = {
  stops: TransitStop[];
  routes: TransitRoute[];
  patterns: TransitPattern[];
};

export type DestinationKind = 'center' | 'station' | 'university' | 'hospital' | 'mall' | 'airport';

export type KeyDestination = LngLat & {
  id: string;
  kind: DestinationKind;
};
