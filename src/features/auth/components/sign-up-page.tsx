import { getRouteApi } from '@tanstack/react-router';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { TextLink } from '@/components/navigation/text-link';
import { Button } from '@/components/ui/button';
import { AuthHeading } from './auth-heading';
import { AuthNotice } from './auth-notice';
import { AuthStatusCard } from './auth-status-card';
import { SignUpForm } from './sign-up-form';

const route = getRouteApi('/_public/sign-up');

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
      <AuthHeading i18nKey="signUp.heading" />
      <SignUpForm redirect={redirect} onEmailSent={setSentTo} />
      <p className="text-center text-body-sm leading-copy text-muted-foreground">
        <Trans
          t={t}
          i18nKey="signUp.hasAccount"
          components={{
            action: (
              <TextLink to="/login" search={{ redirect }} size="inherit" className="px-0.5 py-1" />
            ),
          }}
        />
      </p>
    </>
  );
}
