import { LanguagesIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { changeLocale, isLocale, SUPPORTED_LOCALES } from '@/i18n/i18n';
import { useLocale } from '@/i18n/use-locale';
import { useUpdateProfileLocale } from '../api/profile.queries';

type LanguageSwitcherProps = {
  userId?: string | undefined;
  variant?: 'menu' | 'segmented';
  tone?: 'dark' | 'light';
};

export function LanguageSwitcher({
  userId,
  variant = 'menu',
  tone = 'dark',
}: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const updateProfileLocale = useUpdateProfileLocale();
  const locale = useLocale();

  const handleChange = (value: string) => {
    if (!isLocale(value) || value === locale) {
      return;
    }
    void changeLocale(value);
    if (userId) {
      updateProfileLocale.mutate({ userId, locale: value });
    }
  };

  if (variant === 'segmented' && tone === 'light') {
    return (
      <ToggleGroup
        type="single"
        value={locale}
        onValueChange={handleChange}
        aria-label={t('language.label')}
        className="inline-flex gap-0.5 rounded-md border border-border bg-card p-0.75"
      >
        {SUPPORTED_LOCALES.map((option) => (
          <ToggleGroupItem
            key={option}
            value={option}
            lang={option}
            aria-label={t(`language.${option}`)}
            className="h-7.5 min-w-0 rounded-[6px] px-2.5 text-caption font-semibold text-muted-foreground hover:bg-secondary hover:text-brand data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {t(`language.short.${option}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    );
  }

  if (variant === 'segmented') {
    return (
      <ToggleGroup
        type="single"
        value={locale}
        onValueChange={handleChange}
        aria-label={t('language.label')}
        className="flex w-full gap-2"
      >
        {SUPPORTED_LOCALES.map((option) => (
          <ToggleGroupItem
            key={option}
            value={option}
            lang={option}
            className="h-11 flex-1 rounded-full border border-on-inverse/30 bg-transparent text-label text-on-inverse hover:bg-on-inverse/10 hover:text-on-inverse focus-visible:ring-focus-inverse data-[state=on]:border-cta data-[state=on]:bg-cta data-[state=on]:text-cta-foreground"
          >
            {t(`language.${option}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t('language.label')}>
          <LanguagesIcon aria-hidden />
          <span lang={locale} className="2xl:hidden">
            {t(`language.short.${locale}`)}
          </span>
          <span lang={locale} className="hidden 2xl:inline">
            {t(`language.${locale}`)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={locale} onValueChange={handleChange}>
          {SUPPORTED_LOCALES.map((option) => (
            <DropdownMenuRadioItem key={option} value={option} lang={option}>
              {t(`language.${option}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
