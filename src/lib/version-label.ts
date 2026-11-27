export function versionLabel(version: number): string {
  const tenths = Math.round(version * 10);
  return `${String(Math.trunc(tenths / 10))}.${String(tenths % 10)}`;
}
