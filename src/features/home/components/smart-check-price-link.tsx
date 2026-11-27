import { PillLink } from '@/components/navigation/pill-link';

export type PriceLinkProps<T extends { ctaTarget: string }> =
  | (T & { actionLink?: never })
  | (Omit<T, 'ctaTarget'> & { ctaTarget?: never; actionLink: typeof PillLink });

export const SmartCheckPriceLink: typeof PillLink = ({ children, tone, size }) => (
  <PillLink to="/check" tone={tone} size={size}>
    {children}
  </PillLink>
);
