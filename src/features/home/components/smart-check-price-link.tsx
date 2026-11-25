import { PillLink } from '@/components/navigation/pill-link';

export type PriceLinkProps<T extends { ctaHash: string }> =
  | (T & { actionLink?: never })
  | (Omit<T, 'ctaHash'> & { ctaHash?: never; actionLink: typeof PillLink });

export const SmartCheckPriceLink: typeof PillLink = ({ children, tone, size }) => (
  <PillLink to="/check" tone={tone} size={size}>
    {children}
  </PillLink>
);
