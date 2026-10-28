export type BrandProduct = 'core' | 'physical' | 'smartcheck';

export type BrandTone = 'color' | 'inverse';

export type BrandMarkPart = {
  d: string;
  className: string;
  strokeWidth?: number;
};

const TILE =
  'M15 4h18a11 11 0 0 1 11 11v18a11 11 0 0 1-11 11H15A11 11 0 0 1 4 33V15A11 11 0 0 1 15 4Z';

const CORE_GLYPH: readonly BrandMarkPart[] = [
  { d: 'M12.5 30a11.5 11.5 0 0 1 23 0', className: 'fill-none stroke-on-inverse', strokeWidth: 4 },
  { d: 'M29.8 20.1a11.5 11.5 0 0 1 5.7 9.9', className: 'fill-none stroke-cta', strokeWidth: 4 },
  { d: 'M24 30l6.5-7.5', className: 'fill-none stroke-on-inverse', strokeWidth: 3.2 },
  { d: 'M21 30a3 3 0 1 0 6 0a3 3 0 1 0-6 0Z', className: 'fill-on-inverse' },
];

const PHYSICAL_GLYPH: readonly BrandMarkPart[] = [
  {
    d: 'M11.5 24 23 14.5 34.5 24M14.5 21.5V35h9',
    className: 'fill-none stroke-primary',
    strokeWidth: 3,
  },
  {
    d: 'M26 29.5a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0Z',
    className: 'fill-none stroke-primary',
    strokeWidth: 3,
  },
  { d: 'M35.5 33.5l3.8 3.8', className: 'fill-none stroke-primary', strokeWidth: 3.4 },
];

const SMARTCHECK_SHIELD =
  'M24 10.5l11.5 4.2v8.4c0 7.6-5 12.8-11.5 15.4-6.5-2.6-11.5-7.8-11.5-15.4v-8.4Z';
const SMARTCHECK_TICK = 'M18.8 24.2l3.7 3.7 6.8-7.3';
const SMARTCHECK_SPARK = {
  d: 'M37 7l1.1 2.9 2.9 1.1-2.9 1.1-1.1 2.9-1.1-2.9-2.9-1.1 2.9-1.1Z',
  className: 'fill-cta stroke-info',
  strokeWidth: 1.4,
} satisfies BrandMarkPart;

export const BRAND_MARKS: Readonly<
  Record<BrandProduct, Record<BrandTone, readonly BrandMarkPart[]>>
> = {
  core: {
    color: [{ d: TILE, className: 'fill-primary' }, ...CORE_GLYPH],
    inverse: [
      { d: TILE, className: 'fill-primary stroke-on-inverse', strokeWidth: 2.5 },
      ...CORE_GLYPH,
    ],
  },
  physical: {
    color: [{ d: TILE, className: 'fill-cta' }, ...PHYSICAL_GLYPH],
    inverse: [{ d: TILE, className: 'fill-cta' }, ...PHYSICAL_GLYPH],
  },
  smartcheck: {
    color: [
      { d: TILE, className: 'fill-info' },
      { d: SMARTCHECK_SHIELD, className: 'fill-on-inverse' },
      { d: SMARTCHECK_TICK, className: 'fill-none stroke-info', strokeWidth: 3.2 },
      SMARTCHECK_SPARK,
    ],
    inverse: [
      { d: TILE, className: 'fill-on-inverse' },
      { d: SMARTCHECK_SHIELD, className: 'fill-info' },
      { d: SMARTCHECK_TICK, className: 'fill-none stroke-on-inverse', strokeWidth: 3.2 },
      SMARTCHECK_SPARK,
    ],
  },
};
