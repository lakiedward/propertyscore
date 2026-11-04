import type { StopService } from './accessibility.formula.ts';
import { distanceMeters } from './geo.ts';
import type { LngLat, TransitMode, TransitNetwork } from './transit.types.ts';

export type StopPoint = LngLat & { id: string; name: string | null };

export type StopRouteLink = {
  stopKey: string;
  routeKey: string;
  directionLabel: string;
  departuresPerHour: number | null;
};

const STOP_GROUP_RADIUS_M = 200;

function normaliseName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function groupStops(
  points: readonly StopPoint[],
  radiusM = STOP_GROUP_RADIUS_M,
): Map<string, string> {
  const groups = new Map<string, StopPoint[]>();
  const groupOf = new Map<string, string>();
  for (const point of points) {
    const name = point.name ? normaliseName(point.name) : '';
    if (name === '') {
      groupOf.set(point.id, point.id);
      continue;
    }
    const candidates = groups.get(name) ?? [];
    const match = candidates.find((leader) => distanceMeters(leader, point) <= radiusM);
    if (match) {
      groupOf.set(point.id, match.id);
    } else {
      candidates.push(point);
      groups.set(name, candidates);
      groupOf.set(point.id, point.id);
    }
  }
  return groupOf;
}

export function centroid(points: readonly LngLat[]): LngLat {
  const total = points.reduce(
    (sum, point) => ({ lng: sum.lng + point.lng, lat: sum.lat + point.lat }),
    { lng: 0, lat: 0 },
  );
  return { lng: total.lng / points.length, lat: total.lat / points.length };
}

export function stopRouteLinks(network: TransitNetwork): StopRouteLink[] {
  const links = new Map<string, StopRouteLink>();
  for (const pattern of network.patterns) {
    pattern.stopKeys.forEach((stopKey, position) => {
      const id = `${stopKey}\u0000${pattern.routeKey}\u0000${pattern.directionLabel}`;
      const departures = pattern.stopDeparturesPerHour?.[position] ?? null;
      const current = links.get(id);
      if (!current) {
        links.set(id, {
          stopKey,
          routeKey: pattern.routeKey,
          directionLabel: pattern.directionLabel,
          departuresPerHour: departures,
        });
      } else if (departures !== null) {
        current.departuresPerHour = (current.departuresPerHour ?? 0) + departures;
      }
    });
  }
  return [...links.values()];
}

export function stopServices(
  network: TransitNetwork,
  links: readonly StopRouteLink[],
): StopService[] {
  const modeOfRoute = new Map<string, TransitMode>(
    network.routes.map((route) => [route.key, route.mode]),
  );
  return links.flatMap((link) => {
    const mode = modeOfRoute.get(link.routeKey);
    return mode
      ? [
          {
            stopKey: link.stopKey,
            routeKey: link.routeKey,
            mode,
            departuresPerHour: link.departuresPerHour,
          },
        ]
      : [];
  });
}

export function mergeNetworks(networks: readonly TransitNetwork[]): TransitNetwork {
  return {
    stops: networks.flatMap((network) => network.stops),
    routes: networks.flatMap((network) => network.routes),
    patterns: networks.flatMap((network) => network.patterns),
  };
}

export function routeKeyResolver(
  routeKeys: Iterable<string>,
): (routeId: string | null) => string | null {
  const keys = new Set(routeKeys);
  return (routeId) => {
    if (!routeId) return null;
    if (keys.has(routeId)) return routeId;
    for (const key of keys) if (key.endsWith(`:${routeId}`)) return key;
    return null;
  };
}
