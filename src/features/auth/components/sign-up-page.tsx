import { getRouteApi } from '@tanstack/react-router';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { TextLink } from '@/components/navigation/text-link';
import { AuthHeading } from './auth-heading';
import { ConfirmEmailCard } from './confirm-email-card';
import { SignUpForm } from './sign-up-form';

const route = getRouteApi('/_public/sign-up');

export function SignUpPage() {
  const { t } = useTranslation('auth');
  const { redirect } = route.useSearch();
  const [confirmation, setConfirmation] = useState<{ email: string; isRepeat: boolean }>();

  if (confirmation) {
    return (
      <ConfirmEmailCard
        email={confirmation.email}
        isRepeat={confirmation.isRepeat}
        redirect={redirect}
        onUseOtherEmail={() => {
          setConfirmation(undefined);
        }}
      />
    );
  }

  return (
    <>
      <AuthHeading i18nKey="signUp.heading" />
      <SignUpForm
        redirect={redirect}
        onConfirmationNeeded={(email, isRepeat) => {
          setConfirmation({ email, isRepeat });
        }}
      />
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
