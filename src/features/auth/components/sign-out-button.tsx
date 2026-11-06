import { LogOutIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { SignOutDialog } from './sign-out-dialog';

export function SignOutButton() {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setIsDialogOpen(true);
        }}
      >
        <LogOutIcon aria-hidden />
        {t('actions.signOut')}
      </Button>
      <SignOutDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}
