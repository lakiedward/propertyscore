import { versionLabel } from './version-label';

describe('versionLabel', () => {
  it('writes a version with one decimal', () => {
    expect(versionLabel(1)).toBe('1.0');
    expect(versionLabel(1.1)).toBe('1.1');
    expect(versionLabel(12.3)).toBe('12.3');
  });
});
