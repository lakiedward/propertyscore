import { Trans, useTranslation } from 'react-i18next';

type AuthHeadingProps = {
  i18nKey: 'login.heading' | 'signUp.heading';
};

export function AuthHeading({ i18nKey }: AuthHeadingProps) {
  const { t } = useTranslation('auth');

  return (
    <h2 className="mb-1 text-center text-[clamp(20px,1.8vw,24px)] leading-snug-title font-normal tracking-snug-title text-balance text-foreground short:text-xl short:whitespace-nowrap">
      <Trans t={t} i18nKey={i18nKey} components={{ strong: <strong className="font-display" /> }} />
    </h2>
  );
}
