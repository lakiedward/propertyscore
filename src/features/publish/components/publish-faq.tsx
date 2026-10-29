import { useTranslation } from 'react-i18next';
import { PUBLISH_SECTION } from '@/components/layout/site-navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function PublishFaq() {
  const { t } = useTranslation('publish');
  const items = t('faq.items', { returnObjects: true });

  return (
    <section id={PUBLISH_SECTION.questions} aria-labelledby="publish-faq-title" className="bg-card">
      <div className="page-wrap grid grid-cols-1 gap-7 py-11 w767:py-20 w1059:grid-cols-[360px_minmax(0,1fr)]">
        <h2 id="publish-faq-title" className="text-h2 leading-[1.12] text-foreground">
          {t('faq.title')}
        </h2>
        <Accordion type="multiple" className="self-start border-t border-border">
          {items.map((item, index) => (
            <AccordionItem key={item.q} value={String(index)} className="border-b border-border">
              <AccordionTrigger className="min-h-0 rounded-none border-0 py-5 text-lg leading-[1.3] font-bold text-foreground hover:text-brand hover:no-underline aria-expanded:text-foreground **:data-[slot=accordion-trigger-icon]:size-5.5">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="max-w-copy pb-5.5 text-body text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
