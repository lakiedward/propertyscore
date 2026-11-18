import { Link } from '@tanstack/react-router';
import { HouseIcon, MenuIcon, XIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { PANEL_LINK_KEYS, type PanelPath } from './panel-paths';
import { SITE_MENU_HEADING_CLASS, SITE_MENU_LINK_CLASS } from './site-menu-styles';
import { HOME_SECTION, type HomeSectionId, type SectionNav } from './site-navigation';

type SiteMenuProps = {
  accountPath?: PanelPath | undefined;
  accountSection?: ReactNode;
  sectionNav?: SectionNav | undefined;
  languageSwitcher: ReactNode;
};

type MenuLink =
  | { key: string; label: string; hash: HomeSectionId; meta?: string }
  | { key: string; label: string; to: '/publish'; meta?: string }
  | { key: string; label: string; to: '/listings'; transaction: 'sale' | 'rent'; meta?: string };

export function SiteMenu({
  accountPath,
  accountSection,
  sectionNav,
  languageSwitcher,
}: SiteMenuProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigate = () => {
    setIsOpen(false);
  };

  const groups: { title: string; links: MenuLink[] }[] = [
    {
      title: t('site.menu.forSale.title'),
      links: [
        {
          key: 'sale',
          label: t('site.menu.forSale.all'),
          to: '/listings',
          transaction: 'sale',
        },
      ],
    },
    {
      title: t('site.menu.forRent.title'),
      links: [
        {
          key: 'rent',
          label: t('site.menu.forRent.all'),
          to: '/listings',
          transaction: 'rent',
        },
      ],
    },
    {
      title: t('site.menu.services.title'),
      links: [
        {
          key: 'physical',
          label: t('site.menu.services.physical'),
          hash: HOME_SECTION.physical,
          meta: formatPrice(SERVICE_PRICES.physical.amount, SERVICE_PRICES.physical.currency),
        },
        {
          key: 'smart-check',
          label: t('site.menu.services.smartCheck'),
          hash: HOME_SECTION.smartCheck,
          meta: formatPrice(SERVICE_PRICES.smartCheck.amount, SERVICE_PRICES.smartCheck.currency),
        },
        {
          key: 'consultation',
          label: t('site.menu.services.consultation'),
          hash: HOME_SECTION.pricing,
          meta: t('site.menu.services.priceFrom', {
            price: formatPrice(
              SERVICE_PRICES.consultationFrom.amount,
              SERVICE_PRICES.consultationFrom.currency,
            ),
          }),
        },
        { key: 'pricing', label: t('site.menu.services.pricing'), hash: HOME_SECTION.pricing },
      ],
    },
    {
      title: t('site.menu.owners.title'),
      links: [
        { key: 'publish', label: t('site.menu.owners.publish'), to: '/publish' },
        { key: 'partners', label: t('site.menu.owners.partners'), hash: HOME_SECTION.partners },
      ],
    },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 rounded-md border border-border-control text-brand hover:bg-surface-alt hover:text-brand"
          aria-label={t('site.header.openMenu')}
        >
          <MenuIcon aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="flex w-full flex-col gap-0 overflow-hidden border-none bg-surface-inverse p-0 text-on-inverse data-[side=left]:w-full data-[side=left]:sm:max-w-105"
      >
        <SheetTitle className="sr-only">{t('site.menu.label')}</SheetTitle>
        <div className="flex min-h-19 shrink-0 items-center justify-between gap-4 border-b border-on-inverse/14 px-5.5">
          <Link
            to="/"
            hash={HOME_SECTION.main}
            onClick={handleNavigate}
            aria-label={t('site.header.brandHome')}
            className="rounded-md focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none"
          >
            <Logo size="sm" tone="inverse" isDecorative />
          </Link>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-on-inverse hover:bg-on-inverse/10 focus-visible:ring-focus-inverse focus-visible:ring-offset-surface-inverse"
              aria-label={t('site.menu.close')}
            >
              <XIcon aria-hidden />
            </Button>
          </SheetClose>
        </div>
        <nav
          aria-label={t('site.menu.nav')}
          className="flex min-h-0 scrollbar-inverse flex-1 flex-col gap-7 overflow-y-auto px-5.5 pt-6 pb-10"
        >
          <Link
            to="/"
            hash={HOME_SECTION.main}
            onClick={handleNavigate}
            className="flex min-h-13 items-center gap-3 rounded-lg bg-on-inverse/8 px-4 text-label focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none"
          >
            <HouseIcon aria-hidden className="size-5" />
            {t('site.menu.home')}
          </Link>
          <div className="grid grid-cols-2 gap-2 w820:hidden">
            <Button asChild variant="cta" size="nav">
              <Link
                to="/"
                hash={HOME_SECTION.physical}
                onClick={handleNavigate}
                aria-label={t('site.header.physical')}
              >
                <BrandMark product="physical" size={18} />
                <Logo product="physical" size="2xs" hasMark={false} isDecorative />
              </Link>
            </Button>
            <Button asChild variant="info" size="nav">
              <Link
                to="/"
                hash={HOME_SECTION.smartCheck}
                onClick={handleNavigate}
                aria-label={t('site.header.smartCheck')}
              >
                <BrandMark product="smartcheck" tone="inverse" size={18} />
                <Logo product="smartcheck" tone="inverse" size="2xs" hasMark={false} isDecorative />
              </Link>
            </Button>
            <Button asChild variant="outlineInverse" size="nav" className="col-span-2">
              <Link to="/publish" onClick={handleNavigate}>
                {t('site.header.publish')}
              </Link>
            </Button>
          </div>
          {sectionNav ? (
            <section className="flex flex-col gap-1 w820:hidden">
              <h2 className={SITE_MENU_HEADING_CLASS}>{t('site.menu.onThisPage')}</h2>
              {sectionNav.links.map((link) => (
                <Link
                  key={link.id}
                  to={sectionNav.page}
                  hash={link.id}
                  onClick={handleNavigate}
                  className={SITE_MENU_LINK_CLASS}
                >
                  {t(link.labelKey)}
                </Link>
              ))}
            </section>
          ) : null}
          {groups.map((group) => (
            <section key={group.title} className="flex flex-col gap-1">
              <h2 className={SITE_MENU_HEADING_CLASS}>{group.title}</h2>
              {group.links.map((link) => (
                <Link
                  key={link.key}
                  {...('transaction' in link
                    ? { to: link.to, search: { transaction: link.transaction } }
                    : 'to' in link
                      ? { to: link.to }
                      : { to: '/', hash: link.hash })}
                  onClick={handleNavigate}
                  className={cn(SITE_MENU_LINK_CLASS, 'justify-between')}
                >
                  <span>{link.label}</span>
                  {link.meta ? (
                    <span className="text-small font-bold text-cta tabular-nums">{link.meta}</span>
                  ) : null}
                </Link>
              ))}
            </section>
          ))}
          {accountSection ?? (
            <section className="flex flex-col gap-1">
              <h2 className={SITE_MENU_HEADING_CLASS}>{t('site.footer.account.title')}</h2>
              <Link
                to={accountPath ?? '/login'}
                onClick={handleNavigate}
                className={SITE_MENU_LINK_CLASS}
              >
                {accountPath ? t(PANEL_LINK_KEYS[accountPath]) : t('site.header.signIn')}
              </Link>
            </section>
          )}
          <section className="flex flex-col gap-3">
            <h2 className="font-heading text-h4 text-on-inverse">{t('site.menu.language')}</h2>
            {languageSwitcher}
          </section>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
