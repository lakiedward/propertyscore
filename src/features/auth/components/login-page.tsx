import { getRouteApi } from '@tanstack/react-router';
import { Trans, useTranslation } from 'react-i18next';
import { TextLink } from '@/components/navigation/text-link';
import { AuthHeading } from './auth-heading';
import { LoginForm } from './login-form';

const route = getRouteApi('/_public/login');

export function LoginPage() {
  const { t } = useTranslation('auth');
  const { redirect } = route.useSearch();

  return (
    <>
      <AuthHeading i18nKey="login.heading" />
      <LoginForm redirect={redirect} />
      <p className="text-center text-body-sm leading-copy text-muted-foreground">
        <Trans
          t={t}
          i18nKey="login.noAccount"
          components={{
            link: (
              <TextLink
                to="/sign-up"
                search={{ redirect }}
                size="inherit"
                className="px-0.5 py-1"
              />
            ),
          }}
        />
      </p>
    </>
  );
}
