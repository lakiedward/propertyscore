import { useSuspenseQuery } from '@tanstack/react-query';
import { PanelPage } from '@/components/layout/panel-page';
import { authQueries, ChangePasswordSection, DeleteAccountSection } from '@/features/auth';

type AccountSettingsPageProps = {
  userId: string;
  email: string;
};

export function AccountSettingsPage({ userId, email }: AccountSettingsPageProps) {
  const { data: hasPassword } = useSuspenseQuery(authQueries.accountHasPassword(userId));

  return (
    <>
      <PanelPage titleKey="panel.account.nav.settings" />
      <div className="flex w-full max-w-narrow flex-col gap-6">
        <ChangePasswordSection key={String(hasPassword)} hasPassword={hasPassword} />
        <DeleteAccountSection
          key={`delete-${String(hasPassword)}`}
          email={email}
          hasPassword={hasPassword}
        />
      </div>
    </>
  );
}
