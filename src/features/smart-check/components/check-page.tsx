import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { CHECK_STEPS } from '../smart-check.schemas';

type CheckPageProps = {
  step: (typeof CHECK_STEPS)[number];
};

export function CheckPage({ step }: CheckPageProps) {
  const { t } = useTranslation('smartCheck');

  return (
    <section aria-labelledby="check-title" className="bg-card py-10 w767:py-14">
      <div className="page-wrap flex flex-col gap-6">
        <h1
          id="check-title"
          className="text-[32px] leading-[1.14] font-extrabold tracking-title text-foreground w767:text-[44px]"
        >
          {t('check.title')}
        </h1>
        <ol aria-label={t('check.steps.label')} className="flex flex-wrap gap-2">
          {CHECK_STEPS.map((item, index) => (
            <li
              key={item}
              aria-current={item === step ? 'step' : undefined}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-caption font-bold',
                item === step
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-surface-subtle text-muted-foreground',
              )}
            >
              {t('check.steps.item', { number: index + 1, label: t(`check.steps.${item}`) })}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
