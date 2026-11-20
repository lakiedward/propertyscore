import { EllipsisIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { StatusPill } from '@/components/feedback/status-pill';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';
import { initialsOf } from '@/features/profile';
import { formatDate } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { useRemoveInspector } from '../api/staff.queries';
import type { StaffUser } from '../staff.types';
import { InspectorCityDialog } from './inspector-city-dialog';

const ROLE_BADGE_CLASS = {
  user: 'bg-surface-sunken text-foreground',
  admin: 'bg-primary text-primary-foreground',
  inspector: 'bg-cta text-cta-foreground',
} as const;

type UserRowProps = {
  user: StaffUser;
};

export function UserRow({ user }: UserRowProps) {
  const { t } = useTranslation('staff');
  const [dialog, setDialog] = useState<'city' | 'remove' | null>(null);
  const removeInspector = useRemoveInspector();
  const name = user.full_name ?? t('users.unnamed');
  const isInspector = user.roles.includes('inspector');

  return (
    <TableRow className="border-border-subtle">
      <TableCell className="px-5 py-2.5">
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-meta font-extrabold text-brand"
          >
            {initialsOf(name)}
          </span>
          <span className="truncate text-small font-bold">{name}</span>
        </span>
      </TableCell>
      <TableCell className="text-small">{user.email}</TableCell>
      <TableCell className="text-small tabular-nums">{user.phone ?? t('users.noPhone')}</TableCell>
      <TableCell>
        <span className="flex flex-wrap gap-1">
          {user.roles.map((role) => (
            <span
              key={role}
              className={cn(
                'inline-flex h-6 items-center rounded-full px-2 text-meta font-bold',
                ROLE_BADGE_CLASS[role],
              )}
            >
              {role === 'inspector' && user.inspector_city_name
                ? t('users.inspectorCity', { city: user.inspector_city_name })
                : t(`users.role.${role}`)}
            </span>
          ))}
        </span>
      </TableCell>
      <TableCell className="text-small text-muted-foreground">
        {formatDate(user.created_at)}
      </TableCell>
      <TableCell>
        <StatusPill
          shape="tag"
          tone={user.is_blocked ? 'error' : 'success'}
          label={t(user.is_blocked ? 'users.state.blocked' : 'users.state.active')}
        />
      </TableCell>
      <TableCell className="px-5">
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
          </DropdownMenuContent>
        </DropdownMenu>
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
      </TableCell>
    </TableRow>
  );
}
