import { Link } from '@tanstack/react-router';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { FileRouteTypes } from '@/routeTree.gen';

type BreadcrumbItem = {
  id: string;
  label: string;
  to?: FileRouteTypes['to'];
};

type BreadcrumbsProps = {
  items: readonly BreadcrumbItem[];
  className?: string;
};

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const { t } = useTranslation();
  const lastIndex = items.length - 1;

  return (
    <nav aria-label={t('breadcrumbs.label')} className={cn('min-w-0', className)}>
      <ol className="flex min-w-0 items-center text-body-sm font-bold text-muted-foreground">
        {items.map((item, index) => (
          <Fragment key={item.id}>
            {index > 0 ? (
              <li aria-hidden className="shrink-0 px-1.5">
                /
              </li>
            ) : null}
            <li className={cn('min-w-0', index === lastIndex ? 'truncate' : 'shrink-0')}>
              {index === lastIndex || !item.to ? (
                <span
                  aria-current={index === lastIndex ? 'page' : undefined}
                  className="block max-w-[32ch] truncate"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="rounded-sm underline-offset-4 hover:text-brand hover:underline focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {item.label}
                </Link>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
