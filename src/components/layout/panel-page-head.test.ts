import roCommon from '@/i18n/locales/ro/common.json';
import { changeLocale } from '@/i18n/i18n';
import { panelPageHead } from './panel-page-head';

const APP_NAME = roCommon.app.name;

describe('panelPageHead', () => {
  beforeEach(async () => {
    await changeLocale('ro');
  });

  it('titles an account page with the page and the app name', () => {
    expect(panelPageHead('panel.account.nav.settings')()).toEqual({
      meta: [{ title: `${roCommon.panel.account.nav.settings} · ${APP_NAME}` }],
    });
  });

  it('marks an admin page as part of the admin panel', () => {
    const page = roCommon.panel.admin.pageTitle.replace('{{page}}', roCommon.panel.admin.nav.users);

    expect(panelPageHead('panel.admin.nav.users')()).toEqual({
      meta: [{ title: `${page} · ${APP_NAME}` }],
    });
  });
});
