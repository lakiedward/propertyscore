import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const photoVariants = cva('block w-full object-cover', {
  variants: {
    ratio: {
      '4/3': 'aspect-4/3',
      '16/9': 'aspect-video',
      '3/2': 'aspect-3/2',
      fill: 'h-full',
    },
  },
  defaultVariants: { ratio: '4/3' },
});

type PhotoProps = VariantProps<typeof photoVariants> & {
  src: string;
  alt: string;
  caption?: string;
  label?: string;
  isEager?: boolean;
  className?: string;
  imageClassName?: string;
};

export function Photo({
  src,
  alt,
  caption,
  label,
  ratio,
  isEager = false,
  className,
  imageClassName,
}: PhotoProps) {
  return (
    <figure className={cn('flex flex-col gap-2', className)}>
      <div className="relative h-full overflow-hidden rounded-xl bg-surface-alt">
        <img
          src={src}
          alt={alt}
          loading={isEager ? 'eager' : 'lazy'}
          decoding="async"
          className={cn(photoVariants({ ratio }), imageClassName)}
        />
        {label ? (
          <span className="absolute bottom-3 left-3 rounded-sm bg-card/95 px-2 py-1 text-meta font-semibold text-foreground">
            {label}
          </span>
        ) : null}
      </div>
      {caption ? (
        <figcaption className="text-caption text-muted-foreground">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
