import { cva } from 'class-variance-authority';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { AuthInput } from './auth-input';

const toggleVariants = cva(
  'absolute grid place-items-center rounded-md text-muted-foreground transition-colors duration-(--duration-fast) hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none',
  {
    variants: {
      look: {
        auth: 'top-1/2 right-1.5 size-11 -translate-y-1/2',
        settings: 'inset-y-0 right-0 w-11',
      },
    },
    defaultVariants: { look: 'auth' },
  },
);

export function PasswordInput({ className, look, ...props }: ComponentProps<typeof AuthInput>) {
  const { t } = useTranslation('auth');
  const [isVisible, setIsVisible] = useState(false);
  const Icon = isVisible ? EyeOffIcon : EyeIcon;

  return (
    <div className="relative">
      <AuthInput
        {...props}
        look={look}
        type={isVisible ? 'text' : 'password'}
        className={cn('pr-14', className)}
      />
      <button
        type="button"
        aria-label={t(isVisible ? 'fields.password.hide' : 'fields.password.show')}
        onClick={() => {
          setIsVisible((value) => !value);
        }}
        className={toggleVariants({ look })}
      >
        <Icon aria-hidden className="size-5" />
      </button>
    </div>
  );
}
