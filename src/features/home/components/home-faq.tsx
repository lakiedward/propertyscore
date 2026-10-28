import { useTranslation } from 'react-i18next';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function HomeFaq() {
  const { t } = useTranslation('home');
  const items = t('faq.items', { returnObjects: true });

  return (
    <section
      id={HOME_SECTION.questions}
      aria-labelledby="questions-title"
      className="bg-card pt-15 w520:pt-24.5"
    >
      <div className="page-wrap grid grid-cols-1 gap-13.75 pb-18.5 w820:grid-cols-[0.65fr_1fr]">
        <h2
          id="questions-title"
          className="mt-3.75 text-[clamp(34px,4vw,58px)] leading-[1.08] font-[740] tracking-[-0.04em] text-foreground"
        >
          <span className="block">{t('faq.titleLead')}</span>
          <span className="block text-muted-foreground">{t('faq.titleAccent')}</span>
        </h2>
        <Accordion type="multiple" className="self-start border-t border-faq-line">
          {items.map((item, index) => (
            <AccordionItem key={item.q} value={String(index)} className="border-faq-line">
              <AccordionTrigger className="min-h-16.75 items-center py-0 text-label font-bold text-foreground hover:no-underline data-[state=open]:text-brand">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="max-w-copy pr-7.5 pb-5 text-small text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
