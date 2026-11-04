export type TrustKind = 'physical' | 'online' | 'none';

export const TRUST_KEYS = {
  physical: { label: 'trust.physical', short: 'trust.physicalShort' },
  online: { label: 'trust.smartcheck', short: 'trust.smartcheckShort' },
  none: { label: 'trust.none', short: 'trust.noneShort' },
} as const satisfies Record<TrustKind, { label: string; short: string }>;
