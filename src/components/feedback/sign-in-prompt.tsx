import { Link, useLocation } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type SignInPromptProps = {
  trigger: ReactNode;
  message: string;
};

export function SignInPrompt({ trigger, message }: SignInPromptProps) {
  const { t } = useTranslation();
  const redirect = useLocation({ select: (location) => location.href });

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-3 p-4">
        <p className="text-small text-foreground">{message}</p>
        <Button asChild size="sm" className="touch-target">
          <Link to="/login" search={{ redirect }}>
            {t('site.header.signIn')}
          </Link>
        </Button>
      </PopoverContent>
    </Popover>
  );
}
