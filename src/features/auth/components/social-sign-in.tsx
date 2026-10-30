import { AppleIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FacebookMark } from '@/components/brand/facebook-mark';
import { GoogleMark } from '@/components/brand/google-mark';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SocialProvider } from '../auth.types';

const PROVIDERS: readonly { id: SocialProvider; mark: ReactNode; className: string }[] = [
  {
    id: 'google',
    mark: <GoogleMark />,
    className:
      'border-border bg-card text-foreground hover:border-border-control hover:bg-secondary',
  },
  {
    id: 'apple',
    mark: <AppleIcon aria-hidden className="size-5" />,
    className: 'border-social-apple bg-social-apple text-on-inverse hover:bg-social-apple-hover',
  },
  {
    id: 'facebook',
    mark: <FacebookMark />,
    className:
      'border-social-facebook bg-social-facebook text-on-inverse hover:bg-social-facebook-hover',
  },
];

type SocialSignInProps = {
  onSelect: (provider: SocialProvider) => void;
};

export function SocialSignIn({ onSelect }: SocialSignInProps) {
  const { t } = useTranslation('auth');

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {PROVIDERS.map((provider) => (
          <Button
            key={provider.id}
            type="button"
            onClick={() => {
              onSelect(provider.id);
            }}
            className={cn(
              'h-13.5 w-full gap-3 rounded-md border px-4 text-[15px] font-bold short:h-11.5',
              provider.className,
            )}
          >
            {provider.mark}
            {t(`social.${provider.id}`)}
          </Button>
        ))}
      </div>
      <p className="flex items-center gap-3.5 text-small text-muted-foreground">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        {t('social.or')}
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </p>
    </>
  );
}
