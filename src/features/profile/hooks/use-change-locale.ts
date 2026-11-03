import { changeLocale, isLocale } from '@/i18n/i18n';
import { useLocale } from '@/i18n/use-locale';
import { useUpdateProfileLocale } from '../api/profile.queries';

export function useChangeLocale(userId: string | undefined) {
  const updateProfileLocale = useUpdateProfileLocale();
  const locale = useLocale();

  return (value: string) => {
    if (!isLocale(value) || value === locale) {
      return;
    }
    const previous = locale;
    void changeLocale(value);
    if (userId) {
      updateProfileLocale.mutate(
        { userId, locale: value },
        {
          onError: () => {
            void changeLocale(previous);
          },
        },
      );
    }
  };
}
