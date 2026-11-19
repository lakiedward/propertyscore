import { Button } from '@/components/ui/button';
import { AuthFooterPrompt } from './auth-footer-prompt';

type OtherEmailPromptProps = {
  onUseOtherEmail: () => void;
};

export function OtherEmailPrompt({ onUseOtherEmail }: OtherEmailPromptProps) {
  return (
    <AuthFooterPrompt
      i18nKey="otherEmail"
      action={
        <Button
          type="button"
          variant="link"
          onClick={onUseOtherEmail}
          className="h-auto px-0.5 py-1 align-baseline text-body-sm font-bold"
        />
      }
    />
  );
}
