import { createCn } from 'cn/config';

export const FONT_SIZES = [
  'display',
  'section',
  'section-sm',
  'band',
  'h1',
  'h2',
  'h3',
  'h4',
  'intro',
  'lead-sm',
  'lead',
  'body',
  'service',
  'small',
  'caption',
  'meta',
  'label',
  'eyebrow',
  'price-sm',
  'price-card',
  'price-box',
  'price',
  'price-lg',
  'score-sm',
  'score-md',
  'score',
  'score-xl',
  'score-2xl',
  'logo-2xs',
  'nav-sm',
  'logo-xs',
  'logo-sm',
  'logo-md',
  'logo-card',
  'logo-bundle',
  'logo-inline',
  'logo-lg',
  'logo-xl',
  'micro',
  'body-sm',
  'title-xs',
  'title-sm',
  'title-md',
  'title-lg',
];

export const cn = createCn({
  extend: {
    classGroups: {
      'font-size': [{ text: FONT_SIZES }],
      'font-weight': [{ font: ['nav', 'action', 'control', 'title', 'display'] }],
      leading: [{ leading: ['copy', 'compact'] }],
      tracking: [{ tracking: ['brand', 'title', 'section', 'eyebrow'] }],
      rounded: [
        {
          rounded: [
            'wordmark',
            'note',
            'icon',
            'float',
            'photo',
            'status',
            'thumb',
            'tile',
            'panel',
          ],
        },
      ],
    },
  },
});

export function oneOf<T extends string>(options: readonly T[], value: string): T | undefined {
  return options.find((option) => option === value);
}
