import { z } from 'zod';
import type { LngLat } from '@/components/map/map.config';
import type { MapFeatureCollection } from '@/components/map/map-canvas';
import type { ReadyReport } from './report.types';

const positionSchema = z.tuple([z.number(), z.number()]);
const ringSchema = z.array(positionSchema);

const areaGeometrySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Polygon'), coordinates: z.array(ringSchema) }),
  z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(z.array(ringSchema)) }),
]);

export function areaCollection(geometries: readonly unknown[]): MapFeatureCollection {
  const features = geometries.flatMap((candidate) => {
    const geometry = areaGeometrySchema.safeParse(candidate);
    return geometry.success
      ? [{ type: 'Feature' as const, properties: {}, geometry: geometry.data }]
      : [];
  });
  return { type: 'FeatureCollection', features };
}

export function reportCenter(report: ReadyReport): LngLat {
  return [report.longitude ?? 0, report.latitude ?? 0];
}

export function addressLabel(addressText: string): string {
  return addressText.split(',')[0]?.trim() ?? addressText;
}
