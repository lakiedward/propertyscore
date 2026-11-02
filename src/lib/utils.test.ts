import globalsCss from '@/styles/globals.css?raw';
import { cn, FONT_SIZES, oneOf } from './utils';

function themeFontSizes(): string[] {
  return [...globalsCss.matchAll(/--text-([a-z0-9-]+):/g)]
    .map((match) => match[1])
    .filter((name): name is string => name !== undefined && !name.includes('--'));
}

describe('cn', () => {
  it('keeps a design-system font size next to a text colour', () => {
    expect(cn('text-caption text-foreground')).toBe('text-caption text-foreground');
  });

  it('lets a later design-system font size win', () => {
    expect(cn('text-small', 'text-caption')).toBe('text-caption');
  });

  it('lets a later design-system radius win', () => {
    expect(cn('rounded-xl', 'rounded-photo')).toBe('rounded-photo');
    expect(cn('rounded-note', 'rounded-tile')).toBe('rounded-tile');
  });

  it('lets a later design-system font weight win', () => {
    expect(cn('font-bold', 'font-title')).toBe('font-title');
  });

  it('registers every font-size token of globals.css', () => {
    expect([...FONT_SIZES].sort()).toEqual(themeFontSizes().sort());
  });
});

describe('oneOf', () => {
  const OPTIONS = ['sale', 'rent'] as const;

  it('returns the matching option', () => {
    expect(oneOf(OPTIONS, 'rent')).toBe('rent');
  });

  it('returns undefined for a value outside the options', () => {
    expect(oneOf(OPTIONS, 'lease')).toBeUndefined();
  });
});
