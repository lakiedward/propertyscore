import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import type { PdfAsset } from './render-pdf.ts';

const require = createRequire(import.meta.url);

function packageDir(name: string): string {
  return dirname(require.resolve(`${name}/package.json`));
}

const FONT_FILES = [
  {
    family: 'Manrope Variable',
    pkg: '@fontsource-variable/manrope',
    file: 'manrope',
    weight: '200 800',
  },
  { family: 'Sora Variable', pkg: '@fontsource-variable/sora', file: 'sora', weight: '100 800' },
] as const;

const FONT_SUBSETS = [
  {
    name: 'latin',
    range:
      'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  },
  {
    name: 'latin-ext',
    range:
      'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  },
] as const;

const FONTS_PATH = '/assets/fonts';
const MAP_SCRIPT_PATH = '/assets/maplibre-gl.mjs';
const MAP_WORKER_PATH = '/assets/maplibre-gl-worker.mjs';
export const MAP_STYLES_PATH = '/assets/maplibre-gl.css';

export function fontFaceCss(): string {
  return FONT_FILES.flatMap((font) =>
    FONT_SUBSETS.map(
      (subset) =>
        `@font-face{font-family:'${font.family}';font-style:normal;font-display:block;font-weight:${font.weight};src:url(${FONTS_PATH}/${font.file}-${subset.name}.woff2) format('woff2-variations');unicode-range:${subset.range}}`,
    ),
  ).join('\n');
}

export async function fontAssets(): Promise<Map<string, PdfAsset>> {
  const assets = new Map<string, PdfAsset>();
  for (const font of FONT_FILES) {
    for (const subset of FONT_SUBSETS) {
      const name = `${font.file}-${subset.name}`;
      const body = await readFile(join(packageDir(font.pkg), 'files', `${name}-wght-normal.woff2`));
      assets.set(`${FONTS_PATH}/${name}.woff2`, { contentType: 'font/woff2', body });
    }
  }
  return assets;
}

export async function mapAssets(): Promise<Map<string, PdfAsset>> {
  const dist = join(packageDir('maplibre-gl'), 'dist');
  const [script, worker, styles] = await Promise.all([
    readFile(join(dist, 'maplibre-gl.mjs')),
    readFile(join(dist, 'maplibre-gl-worker.mjs')),
    readFile(join(dist, 'maplibre-gl.css')),
  ]);
  return new Map<string, PdfAsset>([
    [MAP_SCRIPT_PATH, { contentType: 'text/javascript', body: script }],
    [MAP_WORKER_PATH, { contentType: 'text/javascript', body: worker }],
    [MAP_STYLES_PATH, { contentType: 'text/css', body: styles }],
  ]);
}
