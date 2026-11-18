import type { ReactElement } from 'react';
import { Trans, useTranslation } from 'react-i18next';

type AuthFooterPromptProps = {
  i18nKey: 'login.noAccount' | 'signUp.hasAccount' | 'otherEmail';
  action: ReactElement;
};

export function AuthFooterPrompt({ i18nKey, action }: AuthFooterPromptProps) {
  const { t } = useTranslation('auth');

  return (
    <p className="text-center text-body-sm leading-copy text-muted-foreground">
      <Trans t={t} i18nKey={i18nKey} components={{ action }} />
    </p>
  );
}
