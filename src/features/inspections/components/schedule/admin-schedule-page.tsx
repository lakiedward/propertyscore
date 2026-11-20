import { getRouteApi } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PanelPageHeader } from '@/components/layout/panel-page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { oneOf } from '@/lib/utils';
import { SCHEDULE_TABS } from '../../inspection.types';
import { AdminAvailability } from './admin-availability';
import { ScheduleCalendar } from './schedule-calendar';

const [CALENDAR_TAB, AVAILABILITY_TAB] = SCHEDULE_TABS;

const route = getRouteApi('/_authenticated/admin/appointments');

export function AdminSchedulePage() {
  const { t } = useTranslation('inspections');
  const search = route.useSearch();
  const navigate = route.useNavigate();

  return (
    <Tabs
      value={search.tab}
      onValueChange={(value) => {
        const tab = oneOf(SCHEDULE_TABS, value);
        if (tab) {
          void navigate({ search: (previous) => ({ ...previous, tab, sheet: undefined }) });
        }
      }}
      className="gap-5"
    >
      <PanelPageHeader
        description={t('schedule.description')}
        actions={
          <TabsList variant="pill" aria-label={t('schedule.tabs.label')}>
            {SCHEDULE_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {t(`schedule.tabs.${tab}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        }
      />
      <TabsContent value={CALENDAR_TAB} className="text-base">
        <ScheduleCalendar />
      </TabsContent>
      <TabsContent value={AVAILABILITY_TAB} className="text-base">
        <AdminAvailability />
      </TabsContent>
    </Tabs>
  );
}
