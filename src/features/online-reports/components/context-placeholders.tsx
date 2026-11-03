import { ActivityIcon, TrendingUpIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CONTEXT_ITEMS = [
  { key: 'seismic', Icon: ActivityIcon },
  { key: 'investment', Icon: TrendingUpIcon },
] as const;

export function ContextPlaceholders() {
  const { t } = useTranslation('onlineReports');

  return (
    <section aria-labelledby="report-context-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 id="report-context-title" className="text-h4">
          {t('context.title')}
        </h3>
        <p className="text-small text-muted-foreground">{t('context.lead')}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {CONTEXT_ITEMS.map(({ key, Icon }) => (
          <li
            key={key}
            className="flex flex-col gap-2 rounded-xl border border-dashed border-trust-none-border p-5"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-bold">
                <Icon aria-hidden className="size-4 text-muted-foreground" />
                {t(`context.${key}.title`)}
              </span>
              <span className="rounded-sm border border-dashed border-trust-none-border px-1.5 text-meta font-semibold text-data-missing italic">
                {t('context.soon')}
              </span>
            </span>
            <p className="text-small text-muted-foreground">{t(`context.${key}.text`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
