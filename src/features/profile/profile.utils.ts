export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/u)[0] ?? '';
}
