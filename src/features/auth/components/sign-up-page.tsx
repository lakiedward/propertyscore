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
import { SignUpForm } from './sign-up-form';

export function SignUpPage() {
  const { t } = useTranslation('auth');

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>{t('signUp.title')}</h1>
        </CardTitle>
        <CardDescription>{t('signUp.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm />
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        <p>
          <Trans
            t={t}
            i18nKey="signUp.hasAccount"
            components={{ link: <Link to="/login" className="text-foreground underline" /> }}
          />
        </p>
      </CardFooter>
    </Card>
  );
}
