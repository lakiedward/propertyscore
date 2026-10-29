import {
  CalendarIcon,
  CameraIcon,
  FileTextIcon,
  GlobeIcon,
  MailIcon,
  MessageSquareIcon,
  PhoneIcon,
  SearchIcon,
  SendIcon,
  TagIcon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PUBLISH_SECTION } from '@/components/layout/site-navigation';
import { cn } from '@/lib/utils';

const NEED_ITEMS: readonly {
  key: 'photos' | 'surface' | 'year' | 'price' | 'phone' | 'email';
  icon: LucideIcon;
}[] = [
  { key: 'photos', icon: CameraIcon },
  { key: 'surface', icon: FileTextIcon },
  { key: 'year', icon: CalendarIcon },
  { key: 'price', icon: TagIcon },
  { key: 'phone', icon: PhoneIcon },
  { key: 'email', icon: MailIcon },
];

const FLOW_ITEMS: readonly {
  key: 'sent' | 'review' | 'published' | 'messages';
  icon: LucideIcon;
  marker: string;
  line: string;
}[] = [
  { key: 'sent', icon: SendIcon, marker: 'bg-primary text-primary-foreground', line: 'bg-primary' },
  { key: 'review', icon: SearchIcon, marker: 'bg-cta text-cta-foreground', line: 'bg-border' },
  { key: 'published', icon: GlobeIcon, marker: 'bg-secondary text-brand', line: 'bg-border' },
  {
    key: 'messages',
    icon: MessageSquareIcon,
    marker: 'bg-secondary text-brand',
    line: 'bg-transparent',
  },
];

const CARD_CLASS =
  'flex flex-col gap-3.5 rounded-xl border border-border-hairline bg-card p-4.5 shadow-card-soft w767:p-6';

export function ChecklistSection() {
  const { t } = useTranslation('publish');

  return (
    <section
      id={PUBLISH_SECTION.checklist}
      aria-label={t('checklist.needTitle')}
      className="bg-card"
    >
      <div className="page-wrap grid grid-cols-1 gap-5 pb-11 w767:pb-20 w1059:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className={CARD_CLASS}>
          <h2 className="text-h3 text-foreground">{t('checklist.needTitle')}</h2>
          <ul className="grid grid-cols-1 gap-2.5 w767:grid-cols-2">
            {NEED_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.key}
                  className="flex items-center gap-3 rounded-lg bg-background px-3 py-2.5"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-card text-brand">
                    <Icon aria-hidden className="size-4.5" />
                  </span>
                  <span className="flex flex-col">
                    <strong className="text-[15px] leading-[1.55] font-bold text-foreground">
                      {t(`checklist.need.${item.key}.title`)}
                    </strong>
                    <span className="text-small leading-normal text-muted-foreground">
                      {t(`checklist.need.${item.key}.text`)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className={CARD_CLASS}>
          <h2 className="text-h3 text-foreground">{t('checklist.flowTitle')}</h2>
          <ol className="flex flex-col">
            {FLOW_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3">
                  <span className="flex flex-col items-center">
                    <span
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-full',
                        item.marker,
                      )}
                    >
                      <Icon aria-hidden className="size-4" />
                    </span>
                    <span aria-hidden="true" className={cn('w-0.5 flex-1', item.line)} />
                  </span>
                  <span className="flex flex-col gap-0.5 pt-1 pb-4">
                    <strong className="text-[15px] leading-[1.55] font-bold text-foreground">
                      {t(`checklist.flow.${item.key}.title`)}
                    </strong>
                    <span className="text-small leading-normal text-muted-foreground">
                      {t(`checklist.flow.${item.key}.text`)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
