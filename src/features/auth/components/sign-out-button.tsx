import { LogOutIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useSignOut } from '../api/auth.queries';

export function SignOutButton() {
  const { t } = useTranslation();
  const signOut = useSignOut();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={signOut.isPending}
      onClick={() => {
        signOut.mutate();
      }}
    >
      <LogOutIcon aria-hidden />
      {t('actions.signOut')}
    </Button>
  );
}
