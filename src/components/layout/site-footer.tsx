import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';
import { HOME_SECTION, type HomeSectionId } from './site-navigation';

type SiteFooterProps = {
  isSignedIn: boolean;
};

type FooterLink =
  | { key: string; label: string; hash: HomeSectionId; transaction?: 'sale' | 'rent' }
  | { key: string; label: string; to: '/login' | '/account' };

const FOOTER_LINK_CLASS =
  'inline-flex min-h-touch items-center text-body text-on-inverse-muted transition-colors duration-(--duration-fast) hover:text-on-inverse focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none';

export function SiteFooter({ isSignedIn }: SiteFooterProps) {
  const { t } = useTranslation();
  const physicalPrice = formatPrice(
    SERVICE_PRICES.physical.amount,
    SERVICE_PRICES.physical.currency,
  );
  const smartCheckPrice = formatPrice(
    SERVICE_PRICES.smartCheck.amount,
    SERVICE_PRICES.smartCheck.currency,
  );

  const columns: { title: string; links: FooterLink[] }[] = [
    {
      title: t('site.footer.services.title'),
      links: [
        {
          key: 'physical',
          label: t('site.footer.services.physical', { price: physicalPrice }),
          hash: HOME_SECTION.physical,
        },
        {
          key: 'smart-check',
          label: t('site.footer.services.smartCheck', { price: smartCheckPrice }),
          hash: HOME_SECTION.smartCheck,
        },
        {
          key: 'deliverables',
          label: t('site.footer.services.deliverables'),
          hash: HOME_SECTION.deliverables,
        },
        {
          key: 'consultation',
          label: t('site.footer.services.consultation'),
          hash: HOME_SECTION.pricing,
        },
        { key: 'pricing', label: t('site.footer.services.pricing'), hash: HOME_SECTION.pricing },
      ],
    },
    {
      title: t('site.footer.homes.title'),
      links: [
        {
          key: 'buy',
          label: t('site.footer.homes.buy'),
          hash: HOME_SECTION.listings,
          transaction: 'sale',
        },
        {
          key: 'rent',
          label: t('site.footer.homes.rent'),
          hash: HOME_SECTION.listings,
          transaction: 'rent',
        },
        { key: 'map', label: t('site.footer.homes.map'), hash: HOME_SECTION.listings },
        {
          key: 'publish',
          label: t('site.footer.homes.publish'),
          hash: HOME_SECTION.listingIncluded,
        },
      ],
    },
    {
      title: t('site.footer.account.title'),
      links: [
        {
          key: 'account',
          label: t('site.footer.account.account'),
          to: isSignedIn ? '/account' : '/login',
        },
        { key: 'partner', label: t('site.footer.account.partner'), hash: HOME_SECTION.partners },
        {
          key: 'questions',
          label: t('site.footer.account.questions'),
          hash: HOME_SECTION.questions,
        },
      ],
    },
  ];

  return (
    <footer className="bg-surface-inverse text-on-inverse">
      <div className="mx-auto grid max-w-wide gap-10 px-gutter pt-18 pb-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-5 sm:col-span-2 lg:col-span-1">
          <Logo tone="inverse" size="md" />
          <p className="max-w-sm text-body text-on-inverse-muted">{t('site.footer.tagline')}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="inverse" shape="pill">
              <Link to="/" hash={HOME_SECTION.physical}>
                <BrandMark product="physical" size={20} />
                {t('site.footer.physicalCta')}
              </Link>
            </Button>
            <Button asChild variant="info" shape="pill">
              <Link to="/" hash={HOME_SECTION.smartCheck}>
                <BrandMark product="smartcheck" tone="inverse" size={20} />
                {t('site.footer.smartCheckCta')}
              </Link>
            </Button>
          </div>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-1">
            <h2 className="pb-2 text-eyebrow text-cta uppercase">{column.title}</h2>
            <ul className="flex flex-col">
              {column.links.map((link) => (
                <li key={link.key}>
                  {'to' in link ? (
                    <Link to={link.to} className={FOOTER_LINK_CLASS}>
                      {link.label}
                    </Link>
                  ) : (
                    <Link
                      to="/"
                      hash={link.hash}
                      search={link.transaction ? { transaction: link.transaction } : undefined}
                      className={FOOTER_LINK_CLASS}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-on-inverse/15">
        <div className="mx-auto flex max-w-wide flex-col gap-2 px-gutter py-6 text-caption text-on-inverse-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{t('site.footer.copyright', { year: new Date().getFullYear() })}</p>
          <a
            href={`mailto:${t('site.footer.email')}`}
            className="inline-flex min-h-touch items-center hover:text-on-inverse focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none"
          >
            {t('site.footer.email')}
          </a>
        </div>
      </div>
    </footer>
  );
}
