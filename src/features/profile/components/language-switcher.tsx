import { LanguagesIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
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
};

export function LanguageSwitcher({ userId }: LanguageSwitcherProps) {
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t('language.label')}>
          <LanguagesIcon aria-hidden />
          <span lang={locale}>{t(`language.${locale}`)}</span>
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
