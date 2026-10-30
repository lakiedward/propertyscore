import { getRouteApi, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { AuthHeading } from './auth-heading';
import { LoginForm } from './login-form';

const route = getRouteApi('/_public/login');

const LINK_CLASS =
  'rounded-sm px-0.5 py-1 font-bold text-brand hover:underline focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none';

export function LoginPage() {
  const { t } = useTranslation('auth');
  const { redirect } = route.useSearch();

  return (
    <>
      <AuthHeading bold={t('login.headBold')} rest={t('login.headRest')} />
      <LoginForm />
      <div className="flex flex-col items-center gap-0.5 text-[15px] leading-[1.55]">
        <Link to="/password-reset" className={LINK_CLASS}>
          {t('login.forgotPassword')}
        </Link>
        <p className="text-muted-foreground">
          {t('login.noAccount')}{' '}
          <Link to="/sign-up" search={{ redirect }} className={LINK_CLASS}>
            {t('login.createAccount')}
          </Link>
        </p>
      </div>
    </>
  );
}
