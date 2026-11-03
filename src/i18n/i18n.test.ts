async function loadI18n() {
  vi.resetModules();
  return import('./i18n');
}

describe('i18n', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('opens in Romanian even when the browser prefers English', async () => {
    localStorage.clear();
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US']);
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');

    const { currentLocale } = await loadI18n();

    expect(currentLocale()).toBe('ro');
    expect(document.documentElement.lang).toBe('ro');
  });

  it('opens in the language stored by the switcher', async () => {
    localStorage.clear();
    localStorage.setItem('locale', 'en');

    const { currentLocale } = await loadI18n();

    expect(currentLocale()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('loads a feature namespace on demand', async () => {
    const { i18n, loadFeatureNamespaces } = await loadI18n();

    await loadFeatureNamespaces(['publish']);

    expect(i18n.hasResourceBundle('ro', 'publish')).toBe(true);
  });
});
