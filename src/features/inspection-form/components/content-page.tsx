import { getRouteApi } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PanelPageHeader } from '@/components/layout/panel-page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { oneOf } from '@/lib/utils';
import { CONTENT_TABS } from '../inspection-form.types';
import { ConsentEditor } from './consent-editor';
import { FormEditor } from './form-editor';

const [CONSENT_TAB, FORM_TAB] = CONTENT_TABS;

const route = getRouteApi('/_authenticated/admin/content');

export function ContentPage() {
  const { t } = useTranslation('inspectionForm');
  const search = route.useSearch();
  const navigate = route.useNavigate();

  return (
    <Tabs
      value={search.tab}
      onValueChange={(value) => {
        const tab = oneOf(CONTENT_TABS, value);
        if (tab) {
          void navigate({ search: (previous) => ({ ...previous, tab, version: undefined }) });
        }
      }}
      className="gap-5"
    >
      <PanelPageHeader
        description={t('content.description')}
        actions={
          <TabsList variant="pill" aria-label={t('content.tabs.label')}>
            {CONTENT_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {t(`content.tabs.${tab}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        }
      />
      <TabsContent value={CONSENT_TAB} className="text-base">
        <ConsentEditor />
      </TabsContent>
      <TabsContent value={FORM_TAB} className="text-base">
        <FormEditor />
      </TabsContent>
    </Tabs>
  );
}
