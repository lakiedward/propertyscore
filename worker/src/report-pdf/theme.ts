import type { CategoryKey } from '../scoring/categories.ts';
import type { HeatStop } from './heat-grid.ts';
import type { IconName } from './icons.ts';

export type CategoryTheme = {
  name: string;
  icon: IconName;
  color: string;
  tint: string;
  wash: string;
  precision: string;
};

export const CATEGORY_THEME: Record<CategoryKey, CategoryTheme> = {
  safety: {
    name: 'Siguranță',
    icon: 'shield',
    color: '#1F6B9A',
    tint: '#D4EAF8',
    wash: '#EDF6FC',
    precision: 'zonă (celulă)',
  },
  accessibility: {
    name: 'Accesibilitate',
    icon: 'bus',
    color: '#7E5F00',
    tint: '#FDEBA6',
    wash: '#FFF8DC',
    precision: 'adresă · transport public',
  },
  fifteen_minute: {
    name: '15 minute',
    icon: 'map',
    color: '#8A356F',
    tint: '#F0D7E7',
    wash: '#F9EFF5',
    precision: 'adresă · pe străzi reale',
  },
  green: {
    name: 'Green',
    icon: 'leaf',
    color: '#3F6E1B',
    tint: '#DCEDC6',
    wash: '#F0F7E7',
    precision: 'adresă',
  },
  noise: {
    name: 'Zgomot',
    icon: 'vol',
    color: '#1C6B67',
    tint: '#CBE7E3',
    wash: '#E9F5F3',
    precision: 'estimare din străzi',
  },
  air: {
    name: 'Aer',
    icon: 'wind',
    color: '#5B4BA0',
    tint: '#E5E0F5',
    wash: '#F3F0FB',
    precision: 'oraș, nu adresă',
  },
  industry: {
    name: 'Industrie',
    icon: 'fac',
    color: '#55607A',
    tint: '#E1E5EE',
    wash: '#F1F3F7',
    precision: 'adresă',
  },
  education: {
    name: 'Educație',
    icon: 'cap',
    color: '#9A5412',
    tint: '#FAE3CC',
    wash: '#FDF3E8',
    precision: 'adresă',
  },
  health: {
    name: 'Sănătate',
    icon: 'heart',
    color: '#A8323F',
    tint: '#F8DCE0',
    wash: '#FDF0F2',
    precision: 'adresă',
  },
};

export const CONTEXT_THEME = {
  seismic: { color: '#7B5B3A', tint: '#EFE3D4' },
  investment: { color: '#103F32', tint: '#DDED69' },
} as const;

export const SAFETY_HEAT_RAMP = [
  [30, [189, 99, 78]],
  [42, [218, 146, 88]],
  [55, [225, 204, 153]],
  [68, [202, 231, 188]],
  [82, [214, 246, 224]],
] as const satisfies readonly HeatStop[];

export const SAFETY_HEAT_OPACITY = 0.8;

export const NOISE_HEAT_RAMP = [
  [54, [255, 243, 204]],
  [57, [251, 227, 160]],
  [62, [244, 192, 111]],
  [67, [231, 138, 85]],
  [72, [200, 71, 47]],
  [76, [142, 42, 30]],
] as const satisfies readonly HeatStop[];

export const NOISE_HEAT_OPACITY = 0.8;
