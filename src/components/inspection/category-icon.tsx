import { ClipboardCheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_ICONS, isCategoryIconKey } from './category-icons';

type CategoryIconProps = {
  icon: string;
  className?: string;
};

export function CategoryIcon({ icon, className }: CategoryIconProps) {
  const Icon = isCategoryIconKey(icon) ? CATEGORY_ICONS[icon] : ClipboardCheckIcon;
  return <Icon aria-hidden className={cn('size-4.5', className)} />;
}
