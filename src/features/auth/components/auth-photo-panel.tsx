import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/brand/logo';
import heroImage from '@/assets/home/hero-living.webp';

export function AuthPhotoPanel() {
  const { t } = useTranslation(['auth', 'common']);

  return (
    <section
      aria-label={t('common:brand.core')}
      className="relative isolate flex min-h-130 grow basis-120 flex-col justify-between overflow-hidden bg-primary p-[clamp(24px,4vw,48px)] text-on-inverse w920:sticky w920:top-0 w920:h-svh w920:max-h-svh w920:min-h-[min(100vh,640px)] w920:self-start"
    >
      <img
        src={heroImage}
        alt=""
        width={1672}
        height={941}
        className="absolute inset-0 -z-10 size-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-b from-primary/55 via-primary/15 via-38% to-primary/88"
      />
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/"
          aria-label={t('auth:layout.brandHome')}
          className="rounded-md focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none"
        >
          <Logo tone="inverse" size="md" isDecorative className="gap-1 leading-none" />
        </Link>
        <Link
          to="/"
          className="rounded-full bg-foreground/72 px-3 py-1.5 text-caption leading-[1.55] font-[670] text-on-inverse transition-colors duration-(--duration-fast) hover:bg-foreground/85 focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none"
        >
          <span aria-hidden="true">← </span>
          {t('auth:layout.backToSite')}
        </Link>
      </div>
      <div className="flex max-w-130 flex-col items-start gap-5">
        <h1 className="text-[clamp(36px,4vw,56px)] leading-[1.06] font-[740] tracking-[-0.045em]">
          <span className="block">{t('auth:layout.title.line1')}</span>
          <span className="block">{t('auth:layout.title.line2')}</span>
          <span className="block text-cta">{t('auth:layout.title.line3')}</span>
        </h1>
        <p className="max-w-110 text-[clamp(16px,1.3vw,18px)] leading-[1.6] text-pretty text-on-photo">
          {t('auth:layout.text')}
        </p>
      </div>
      <span className="absolute right-4 bottom-3 text-[11px] leading-[1.55] text-on-photo-faint">
        {t('auth:layout.illustrative')}
      </span>
    </section>
  );
}
