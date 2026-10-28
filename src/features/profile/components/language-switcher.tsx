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
};

export function LanguageSwitcher({ userId, variant = 'menu' }: LanguageSwitcherProps) {
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
