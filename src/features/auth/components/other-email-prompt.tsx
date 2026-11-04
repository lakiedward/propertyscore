import { Trans, useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

type OtherEmailPromptProps = {
  onUseOtherEmail: () => void;
};

export function OtherEmailPrompt({ onUseOtherEmail }: OtherEmailPromptProps) {
  const { t } = useTranslation('auth');

  return (
    <p className="text-center text-body-sm leading-copy text-muted-foreground">
      <Trans
        t={t}
        i18nKey="otherEmail"
        components={{
          action: (
            <Button
              type="button"
              variant="link"
              onClick={onUseOtherEmail}
              className="h-auto px-0.5 py-1 align-baseline text-body-sm font-bold"
            />
          ),
        }}
      />
    </p>
  );
}
