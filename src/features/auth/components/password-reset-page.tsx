import { ArrowLeftIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TextLink } from '@/components/navigation/text-link';
import { AuthNotice } from './auth-notice';
import { AuthPageHeading } from './auth-page-heading';

export function PasswordResetPage() {
  const { t } = useTranslation('auth');

  return (
    <>
      <AuthPageHeading title={t('passwordReset.title')} />
      <AuthNotice tone="info" title={t('passwordReset.unavailable.title')}>
        {t('passwordReset.unavailable.text')}
      </AuthNotice>
      <TextLink to="/login" className="inline-flex items-center gap-1.5 self-start py-1">
        <ArrowLeftIcon aria-hidden className="size-4" />
        {t('passwordReset.backToLogin')}
      </TextLink>
    </>
  );
}
