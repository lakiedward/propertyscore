import type { ComponentProps } from 'react';
import { LazyMapCanvas } from '@/components/map/lazy-map-canvas';
import { cn } from '@/lib/utils';

type ReportMapProps = Omit<
  ComponentProps<typeof LazyMapCanvas>,
  'basemap' | 'errorFallback' | 'fallbackClassName'
> & {
  errorLabel: string;
};

export function ReportMap({ errorLabel, className, ...props }: ReportMapProps) {
  return (
    <LazyMapCanvas
      basemap="report"
      isConfinedToBounds
      hasNavigationControl={false}
      fallbackClassName={cn('size-full rounded-none bg-report-map-land', className)}
      errorFallback={
        <div
          className={cn(
            'grid size-full place-items-center bg-report-map-land p-4 text-center text-caption text-muted-foreground',
            className,
          )}
        >
          {errorLabel}
        </div>
      }
      className={cn('size-full rounded-[inherit] bg-report-map-land', className)}
      {...props}
    />
  );
}
