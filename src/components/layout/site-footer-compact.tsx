import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/brand/logo';

export function SiteFooterCompact() {
  const { t } = useTranslation();

  return (
    <footer className="bg-surface-inverse py-6.5 text-on-inverse-soft">
      <div className="mx-auto flex w-[min(1480px,calc(100%-48px))] flex-wrap items-start justify-between gap-5">
        <Link
          to="/"
          className="rounded-sm focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none"
        >
          <Logo tone="inverse" size="md" className="gap-1" />
        </Link>
        <p className="max-w-162.5 text-[11px] leading-[1.55]">{t('site.footer.compactNote')}</p>
      </div>
    </footer>
  );
}
