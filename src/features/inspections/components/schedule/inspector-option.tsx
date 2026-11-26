import { InitialsAvatar } from '@/components/layout/initials-avatar';
import type { AdminInspector } from '../../inspection.types';

export function inspectorOption(inspector: AdminInspector, description: string) {
  return {
    value: inspector.user_id,
    label: inspector.full_name ?? '',
    description,
    leading: <InitialsAvatar name={inspector.full_name ?? ''} size="sm" />,
  };
}
