import { cn } from './utils';

describe('cn', () => {
  it('keeps a design-system font size next to a text colour', () => {
    expect(cn('text-caption text-foreground')).toBe('text-caption text-foreground');
  });

  it('lets a later design-system font size win', () => {
    expect(cn('text-small', 'text-caption')).toBe('text-caption');
  });
});
