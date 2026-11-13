import type * as MapCanvasExports from './map-canvas';

type MapCanvasModule = typeof MapCanvasExports;

let loadedModule: MapCanvasModule | undefined;
let pendingModule: Promise<MapCanvasModule> | undefined;

export function getLoadedMapCanvas(): MapCanvasModule | undefined {
  return loadedModule;
}

export function loadMapCanvas(): Promise<MapCanvasModule> {
  pendingModule ??= import('./map-canvas').then(
    (module) => {
      loadedModule = module;
      return module;
    },
    (error: unknown) => {
      pendingModule = undefined;
      throw error;
    },
  );
  return pendingModule;
}

export function preloadMapCanvas() {
  void loadMapCanvas().catch(() => undefined);
}
