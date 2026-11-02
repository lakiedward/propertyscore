import type { HomeCategory } from '../home.categories';

export const SAMPLE_REPORT = {
  overallScore: 82,
  scores: {
    safety: 78,
    city: 86,
    transport: 92,
    green: 71,
    education: 84,
    health: 68,
    shopping: 90,
  },
  currency: 'EUR',
  pricePerM2: 2000,
  price: 120000,
  monthlyRent: 500,
  verifiedAt: '2026-10-14T10:00:00Z',
} as const satisfies {
  overallScore: number;
  scores: Record<HomeCategory, number>;
  currency: 'EUR';
  pricePerM2: number;
  price: number;
  monthlyRent: number;
  verifiedAt: string;
};
