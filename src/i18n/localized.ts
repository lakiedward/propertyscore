export function localizedText(ro: string, en: string, language: string): string {
  return language === 'en' && en.trim() !== '' ? en : ro;
}
