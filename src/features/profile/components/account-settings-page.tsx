import { useSuspenseQuery } from '@tanstack/react-query';
import { PanelPage } from '@/components/layout/panel-page';
import {
  authQueries,
  ChangePasswordSection,
  DeleteAccountSection,
  PhoneSection,
} from '@/features/auth';

type AccountSettingsPageProps = {
  userId: string;
  email: string;
  redirect: string | undefined;
};

export function AccountSettingsPage({ userId, email, redirect }: AccountSettingsPageProps) {
  const { data: hasPassword } = useSuspenseQuery(authQueries.accountHasPassword(userId));
  const { data: phone } = useSuspenseQuery(authQueries.accountPhone(userId));

  return (
    <>
      <PanelPage titleKey="panel.account.nav.settings" />
      <div className="flex w-full flex-col gap-6">
        <PhoneSection key={phone ?? 'missing'} userId={userId} phone={phone} redirect={redirect} />
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
