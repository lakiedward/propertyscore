import { Link } from '@tanstack/react-router';
import { Trans, useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoginForm } from './login-form';

export function LoginPage() {
  const { t } = useTranslation('auth');

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>{t('login.title')}</h1>
        </CardTitle>
        <CardDescription>{t('login.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        <p>
          <Trans
            t={t}
            i18nKey="login.noAccount"
            components={{ link: <Link to="/sign-up" className="text-foreground underline" /> }}
          />
        </p>
      </CardFooter>
    </Card>
  );
}
