import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';
import { HOME_SECTION, type HomeSectionId } from './site-navigation';

type FooterLink =
  | { key: string; label: string; hash: HomeSectionId; transaction?: 'sale' | 'rent' }
  | { key: string; label: string; to: '/login' | '/account' | '/publish' };

const LEGAL_KEYS = ['terms', 'privacy', 'cookies'] as const;

const FOOTER_LINK_CLASS =
  'inline-flex items-center text-label font-normal text-on-inverse-bright transition-colors duration-(--duration-fast) hover:text-on-inverse focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none';

export function SiteFooter() {
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
        { key: 'publish', label: t('site.footer.homes.publish'), to: '/publish' },
      ],
    },
    {
      title: t('site.footer.account.title'),
      links: [
        { key: 'partner', label: t('site.footer.account.partner'), hash: HOME_SECTION.partners },
        { key: 'portal', label: t('site.footer.account.portal'), hash: HOME_SECTION.partners },
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
      <div className="page-wrap grid grid-cols-1 gap-10 pt-18 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1">
          <Logo tone="inverse" size="md" className="gap-1" />
          <p className="max-w-95 text-label leading-[1.6] font-normal text-on-inverse-muted">
            {t('site.footer.tagline')}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/"
              hash={HOME_SECTION.physical}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-cta py-0 pr-4 pl-2.5 text-small font-extrabold text-brand transition-colors hover:bg-cta-hover focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none"
            >
              <BrandMark product="physical" size={22} />
              {t('site.footer.physicalCta')}
            </Link>
            <Link
              to="/"
              hash={HOME_SECTION.smartCheck}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-info py-0 pr-4 pl-2.5 text-small font-extrabold text-on-inverse transition-colors hover:bg-info-hover focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none"
            >
              <BrandMark product="smartcheck" tone="inverse" size={22} />
              {t('site.footer.smartCheckCta')}
            </Link>
          </div>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-1">
            <h2 className="mb-3.5 text-caption font-extrabold tracking-[0.06em] text-cta uppercase">
              {column.title}
            </h2>
            <ul className="flex flex-col gap-2.5">
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
      <div className="page-wrap mt-12 border-t border-on-inverse/14 pb-8">
        <div className="flex flex-col flex-wrap gap-x-6 gap-y-3 pt-6 text-caption text-on-inverse-faint sm:flex-row sm:justify-between">
          <p>{t('site.footer.copyright', { year: new Date().getFullYear() })}</p>
          <nav aria-label={t('site.footer.legalLabel')} className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_KEYS.map((key) => (
              <span key={key}>{t(`site.footer.legal.${key}`)}</span>
            ))}
            <a
              href={`mailto:${t('site.footer.email')}`}
              className="hover:text-on-inverse focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none"
            >
              {t('site.footer.email')}
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
