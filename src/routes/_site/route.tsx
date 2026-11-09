import { createFileRoute, Outlet, useMatches } from '@tanstack/react-router';
import { MainContent } from '@/components/layout/main-content';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { homePathFor, useAuth } from '@/features/auth';
import { LanguageSwitcher, UserMenu, useSyncProfileLocale } from '@/features/profile';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_site')({
  component: SiteLayout,
});

function SiteLayout() {
  const { user, roles } = useAuth();
  const userId = user?.id;
  const panelPath = homePathFor(roles);
  const isFullScreen = useMatches({
    select: (matches) => matches.some((match) => match.staticData.isFullScreen === true),
  });

  return (
    <div
      className={cn(
        'flex flex-col bg-background',
        isFullScreen ? 'h-svh overflow-hidden' : 'min-h-svh',
      )}
      data-density="comfortable"
    >
      {userId ? <ProfileLocaleSync userId={userId} /> : null}
      <SkipLink />
      <SiteHeader
        account={
          user
            ? {
                path: panelPath,
                menu: <UserMenu user={user} tone="light" panelPath={panelPath} isNameHidden />,
              }
            : undefined
        }
        menuLanguageSwitcher={<LanguageSwitcher userId={userId} variant="segmented" />}
      />
      <MainContent className={cn('flex-1', isFullScreen && 'min-h-0')}>
        <Outlet />
      </MainContent>
      {isFullScreen ? null : <SiteFooter />}
    </div>
  );
}

type ProfileLocaleSyncProps = {
  userId: string;
};

function ProfileLocaleSync({ userId }: ProfileLocaleSyncProps) {
  useSyncProfileLocale(userId);
  return null;
}
