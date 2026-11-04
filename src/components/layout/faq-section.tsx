import { cva, type VariantProps } from 'class-variance-authority';
import { useId, type ReactNode } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const sectionVariants = cva('bg-card', {
  variants: { density: { compact: 'pt-15 w520:pt-24.5', comfortable: '' } },
});

const gridVariants = cva('page-wrap grid grid-cols-1', {
  variants: {
    density: {
      compact: 'gap-13.75 pb-18.5 w820:grid-cols-[0.65fr_1fr]',
      comfortable: 'gap-7 py-11 w767:py-20 w1059:grid-cols-[360px_minmax(0,1fr)]',
    },
  },
});

const titleVariants = cva('text-foreground', {
  variants: {
    density: {
      compact: 'mt-3.75 text-section leading-[1.08] font-title tracking-title',
      comfortable: 'text-h2 leading-heading',
    },
  },
});

const listVariants = cva('self-start border-t', {
  variants: { density: { compact: 'border-faq-line', comfortable: 'border-border' } },
});

const itemVariants = cva('', {
  variants: { density: { compact: 'border-faq-line', comfortable: 'border-b border-border' } },
});

const triggerVariants = cva('font-bold text-foreground hover:no-underline', {
  variants: {
    density: {
      compact: 'min-h-16.75 items-center py-0 text-label data-[state=open]:text-brand',
      comfortable:
        'min-h-0 rounded-none border-0 py-5 text-lg leading-[1.3] hover:text-brand aria-expanded:text-foreground **:data-[slot=accordion-trigger-icon]:size-5.5',
    },
  },
});

const answerVariants = cva('max-w-copy text-muted-foreground', {
  variants: {
    density: { compact: 'pr-7.5 pb-5 text-small', comfortable: 'pb-5.5 text-body' },
  },
});

type FaqItem = { q: string; a: string };

type FaqSectionProps = Required<VariantProps<typeof sectionVariants>> & {
  id: string;
  title: ReactNode;
  items: readonly FaqItem[];
};

export function FaqSection({ id, title, items, density }: FaqSectionProps) {
  const titleId = useId();

  return (
    <section id={id} aria-labelledby={titleId} className={sectionVariants({ density })}>
      <div className={gridVariants({ density })}>
        <h2 id={titleId} className={titleVariants({ density })}>
          {title}
        </h2>
        <Accordion type="multiple" className={listVariants({ density })}>
          {items.map((item) => (
            <AccordionItem key={item.q} value={item.q} className={itemVariants({ density })}>
              <AccordionTrigger className={triggerVariants({ density })}>{item.q}</AccordionTrigger>
              <AccordionContent className={answerVariants({ density })}>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
