import { getRouteApi } from '@tanstack/react-router';
import { TextLink } from '@/components/navigation/text-link';
import { AuthFooterPrompt } from './auth-footer-prompt';
import { AuthHeading } from './auth-heading';
import { LoginForm } from './login-form';

const route = getRouteApi('/_public/login');

export function LoginPage() {
  const { redirect } = route.useSearch();

  return (
    <>
      <AuthHeading i18nKey="login.heading" />
      <LoginForm redirect={redirect} />
      <AuthFooterPrompt
        i18nKey="login.noAccount"
        action={
          <TextLink to="/sign-up" search={{ redirect }} size="inherit" className="px-0.5 py-1" />
        }
      />
    </>
  );
}
