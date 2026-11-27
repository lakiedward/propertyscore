import { localizedText } from './localized';

describe('localizedText', () => {
  it('shows the English text in English and falls back to Romanian when it is empty', () => {
    expect(localizedText('Structură', 'Structure', 'en')).toBe('Structure');
    expect(localizedText('Structură', ' ', 'en')).toBe('Structură');
    expect(localizedText('Structură', 'Structure', 'ro')).toBe('Structură');
  });
});
