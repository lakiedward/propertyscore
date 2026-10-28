import { createCn } from 'cn/config';

const FONT_SIZES = [
  'display',
  'section',
  'h1',
  'h2',
  'h3',
  'h4',
  'lead',
  'body',
  'small',
  'caption',
  'meta',
  'label',
  'eyebrow',
  'price-sm',
  'price',
  'price-lg',
  'score-sm',
  'score-md',
  'score',
  'score-xl',
  'logo-xs',
  'logo-sm',
  'logo-md',
  'logo-lg',
  'logo-xl',
];

export const cn = createCn({
  extend: {
    classGroups: {
      'font-size': [{ text: FONT_SIZES }],
      tracking: [{ tracking: ['brand'] }],
      rounded: [{ rounded: ['wordmark'] }],
    },
  },
});
