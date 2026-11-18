import type { Map as MapLibreMap } from 'maplibre-gl';

export function removeLayersAndSource(
  map: MapLibreMap,
  sourceId: string,
  layerIds: readonly string[],
) {
  for (const layerId of layerIds) {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  }
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}
