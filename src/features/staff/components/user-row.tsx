import { cva } from 'class-variance-authority';
import { ChevronRightIcon, EllipsisIcon } from 'lucide-react';
import { useId, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { StatusPill } from '@/components/feedback/status-pill';
import { InitialsAvatar } from '@/components/layout/initials-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/features/auth';
import { OwnerListings } from '@/features/listings';
import { formatDate } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { useMakeAdmin, useRemoveInspector, useUnblockUser } from '../api/staff.queries';
import type { StaffUser } from '../staff.types';
import { BlockUserDialog } from './block-user-dialog';
import { InspectorCityDialog } from './inspector-city-dialog';

const COLUMN_COUNT = 7;

const roleBadgeVariants = cva('h-6 rounded-full border-0 px-2 text-meta font-bold', {
  variants: {
    role: {
      user: 'bg-surface-sunken text-foreground',
      admin: 'bg-primary text-primary-foreground',
      inspector: 'bg-cta text-cta-foreground',
    },
  },
});

type UserRowProps = {
  user: StaffUser;
};

export function UserRow({ user }: UserRowProps) {
  const { t } = useTranslation('staff');
  const [dialog, setDialog] = useState<'city' | 'remove' | 'admin' | 'block' | 'unblock' | null>(
    null,
  );
  const removeInspector = useRemoveInspector();
  const unblockUser = useUnblockUser();
  const makeAdmin = useMakeAdmin();
  const { user: currentUser } = useAuth();
  const isAdmin = user.roles.includes('admin');
  const canBlock = !isAdmin && user.user_id !== currentUser?.id;
  const name = user.full_name ?? t('users.unnamed');
  const isInspector = user.roles.includes('inspector');
  const canMakeAdmin = !isAdmin && !isInspector && !user.is_blocked;
  const [isExpanded, setIsExpanded] = useState(false);
  const panelId = useId();

  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>) => {
    const target = event.target;
    if (
      !(target instanceof Element) ||
      !event.currentTarget.contains(target) ||
      target.closest('button, a, [role="menuitem"]')
    ) {
      return;
    }
    setIsExpanded((previous) => !previous);
  };

  return (
    <>
      <TableRow
        className={cn('cursor-pointer border-border-subtle', isExpanded && 'bg-surface-highlight')}
        onClick={handleRowClick}
      >
        <TableCell className="px-5 py-2.5">
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={isExpanded ? panelId : undefined}
            aria-label={t(isExpanded ? 'users.listings.hide' : 'users.listings.show', { name })}
            onClick={() => {
              setIsExpanded((previous) => !previous);
            }}
            className="flex min-w-0 items-center gap-2.5 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            <ChevronRightIcon
              aria-hidden
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform duration-(--duration-fast) ease-standard',
                isExpanded && 'rotate-90',
              )}
            />
            <InitialsAvatar name={name} tone="soft" />
            <span className="truncate text-small font-bold">{name}</span>
          </button>
        </TableCell>
        <TableCell className="text-small">{user.email}</TableCell>
        <TableCell className="text-small tabular-nums">
          {user.phone ?? t('users.noPhone')}
        </TableCell>
        <TableCell>
          <span className="flex flex-wrap gap-1">
            {user.roles.map((role) => (
              <Badge key={role} className={roleBadgeVariants({ role })}>
                {role === 'inspector' && user.inspector_city_name
                  ? t('users.inspectorCity', { city: user.inspector_city_name })
                  : t(`users.role.${role}`)}
              </Badge>
            ))}
          </span>
        </TableCell>
        <TableCell className="text-small text-muted-foreground">
          {formatDate(user.created_at)}
        </TableCell>
        <TableCell>
          <span className="flex flex-col gap-1">
            <StatusPill
              shape="tag"
              tone={user.is_blocked ? 'error' : 'success'}
              label={t(user.is_blocked ? 'users.state.blocked' : 'users.state.active')}
            />
            {user.is_blocked && user.block_reason ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="max-w-50 truncate text-meta text-muted-foreground">
                    {user.block_reason}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{user.block_reason}</TooltipContent>
              </Tooltip>
            ) : null}
          </span>
        </TableCell>
        <TableCell className="px-5">
          {isAdmin ? null : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="touch-target"
                  aria-label={t('users.actions.menu', { name })}
                >
                  <EllipsisIcon aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    setDialog('city');
                  }}
                >
                  {t(isInspector ? 'users.actions.changeCity' : 'users.actions.makeInspector')}
                </DropdownMenuItem>
                {isInspector ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                      setDialog('remove');
                    }}
                  >
                    {t('users.actions.removeInspector')}
                  </DropdownMenuItem>
                ) : null}
                {canMakeAdmin ? (
                  <DropdownMenuItem
                    onSelect={() => {
                      setDialog('admin');
                    }}
                  >
                    {t('users.actions.makeAdmin')}
                  </DropdownMenuItem>
                ) : null}
                {canBlock ? (
                  <>
                    <DropdownMenuSeparator />
                    {user.is_blocked ? (
                      <DropdownMenuItem
                        onSelect={() => {
                          setDialog('unblock');
                        }}
                      >
                        {t('users.actions.unblock')}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => {
                          setDialog('block');
                        }}
                      >
                        {t('users.actions.block')}
                      </DropdownMenuItem>
                    )}
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <InspectorCityDialog
            userId={user.user_id}
            name={name}
            cityId={user.inspector_city_id}
            isOpen={dialog === 'city'}
            onOpenChange={(isOpen) => {
              setDialog(isOpen ? 'city' : null);
            }}
          />
          <ConfirmDialog
            isOpen={dialog === 'remove'}
            onOpenChange={(isOpen) => {
              setDialog(isOpen ? 'remove' : null);
            }}
            tone="destructive"
            title={t('users.removeDialog.title')}
            description={t('users.removeDialog.description', { name })}
            confirmLabel={t('users.removeDialog.confirm')}
            pendingLabel={t('users.removeDialog.pending')}
            isPending={removeInspector.isPending}
            onConfirm={() => {
              removeInspector.mutate(user.user_id, {
                onSuccess: () => {
                  toast.success(t('users.removeDialog.done', { name }));
                  setDialog(null);
                },
              });
            }}
          />
          <ConfirmDialog
            isOpen={dialog === 'admin'}
            onOpenChange={(isOpen) => {
              setDialog(isOpen ? 'admin' : null);
            }}
            title={t('users.adminDialog.title', { name })}
            description={t('users.adminDialog.description')}
            confirmLabel={t('users.adminDialog.confirm')}
            pendingLabel={t('users.adminDialog.pending')}
            isPending={makeAdmin.isPending}
            onConfirm={() => {
              makeAdmin.mutate(user.user_id, {
                onSuccess: () => {
                  toast.success(t('users.adminDialog.done', { name }));
                  setDialog(null);
                },
              });
            }}
          />
          <BlockUserDialog
            userId={user.user_id}
            name={name}
            isOpen={dialog === 'block'}
            onOpenChange={(isOpen) => {
              setDialog(isOpen ? 'block' : null);
            }}
          />
          <ConfirmDialog
            isOpen={dialog === 'unblock'}
            onOpenChange={(isOpen) => {
              setDialog(isOpen ? 'unblock' : null);
            }}
            title={t('users.unblockDialog.title', { name })}
            description={t('users.unblockDialog.description')}
            confirmLabel={t('users.unblockDialog.confirm')}
            pendingLabel={t('users.unblockDialog.pending')}
            isPending={unblockUser.isPending}
            onConfirm={() => {
              unblockUser.mutate(user.user_id, {
                onSuccess: () => {
                  toast.success(t('users.unblockDialog.done', { name }));
                  setDialog(null);
                },
              });
            }}
          />
        </TableCell>
      </TableRow>
      {isExpanded ? (
        <TableRow className="border-border-subtle hover:bg-transparent">
          <TableCell colSpan={COLUMN_COUNT} className="bg-surface-subtle p-5 whitespace-normal">
            <section id={panelId} aria-label={t('users.listings.title', { name })}>
              <OwnerListings ownerId={user.user_id} />
            </section>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
