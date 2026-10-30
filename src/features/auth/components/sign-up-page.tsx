import { getRouteApi, Link } from '@tanstack/react-router';
import { MailIcon } from 'lucide-react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AuthHeading } from './auth-heading';
import { AuthNotice } from './auth-notice';
import { AuthStatusCard } from './auth-status-card';
import { SignUpForm } from './sign-up-form';

const route = getRouteApi('/_public/sign-up');

const LINK_CLASS =
  'rounded-sm px-0.5 py-1 font-bold text-brand hover:underline focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none';

export function SignUpPage() {
  const { t } = useTranslation('auth');
  const { redirect } = route.useSearch();
  const [sentTo, setSentTo] = useState<string>();

  if (sentTo) {
    return (
      <AuthStatusCard
        eyebrow={t('signUp.sent.eyebrow')}
        title={t('signUp.sent.title')}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-11 gap-2.5 border-[1.5px] px-4.5 text-body font-bold"
            >
              <MailIcon aria-hidden />
              {t('signUp.sent.resend')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSentTo(undefined);
              }}
              className="h-11 border-[1.5px] px-4.5 text-body font-bold"
            >
              {t('signUp.sent.otherEmail')}
            </Button>
          </>
        }
      >
        <p className="text-body text-muted-foreground">
          <Trans
            t={t}
            i18nKey="signUp.sent.text"
            values={{ email: sentTo }}
            components={{ strong: <strong className="font-bold text-foreground" /> }}
          />
        </p>
        <AuthNotice tone="info">{t('signUp.sent.spam')}</AuthNotice>
      </AuthStatusCard>
    );
  }

  return (
    <>
      <AuthHeading bold={t('signUp.headBold')} rest={t('signUp.headRest')} />
      <SignUpForm onEmailSent={setSentTo} />
      <div className="flex flex-col items-center gap-0.5 text-[15px] leading-[1.55]">
        <p className="text-muted-foreground">
          {t('signUp.hasAccount')}{' '}
          <Link to="/login" search={{ redirect }} className={LINK_CLASS}>
            {t('signUp.signIn')}
          </Link>
        </p>
      </div>
    </>
  );
}
